import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { HttpService } from "@nestjs/axios";
import { Model } from "mongoose";
import { firstValueFrom } from "rxjs";
import axios from "axios";
import type {
  CompletePennylaneOAuthBody,
  CompleteQontoOAuthBody,
  ConnectPennylaneBody,
  ConnectQontoBody,
  PennylaneConnectionStatus,
  PennylaneOAuthStartResponse,
  QontoConnectionStatus,
  QontoOAuthStartResponse,
  SyncCaseToPennylaneBody,
  SyncCaseToPennylaneResult,
  SyncCaseToQontoBody,
  SyncCaseToQontoResult,
} from "@planwise/shared";
import {
  organizationScopeFilter,
  requireOrganizationId,
  QONTO_INVOICE_NUMBER_REQUIRED_MESSAGE,
} from "@planwise/shared";
import { AbstractIntegrationsService } from "./ports/integrations.service.port";
import {
  IntegrationCredentialDocument,
  IntegrationSyncDocument,
} from "../persistence/integration.schema";
import { decryptSecret, encryptSecret, tokenHint } from "./secret-crypto";
import { signOAuthState, verifyOAuthState } from "./oauth-state";

const PROVIDER = "pennylane";
const QONTO_PROVIDER = "qonto";
const DEFAULT_API_BASE = "https://app.pennylane.com/api/external/v2";
const DEFAULT_OAUTH_AUTHORIZE = "https://app.pennylane.com/oauth/authorize";
const DEFAULT_OAUTH_TOKEN = "https://app.pennylane.com/oauth/token";
const DEFAULT_OAUTH_REVOKE = "https://app.pennylane.com/oauth/revoke";
const DEFAULT_SCOPES = "customers:all customer_invoices:all";
const DEFAULT_QONTO_API_BASE = "https://thirdparty.qonto.com/v2";
const DEFAULT_QONTO_OAUTH_AUTHORIZE = "https://oauth.qonto.com/oauth2/auth";
const DEFAULT_QONTO_OAUTH_TOKEN = "https://oauth.qonto.com/oauth2/token";
const DEFAULT_QONTO_SCOPES =
  "organization.read offline_access client.read client.write client_invoice.read client_invoice.write";
/** Rafraîchir 60s avant expiration. */
const REFRESH_SKEW_MS = 60_000;

@Injectable()
export class IntegrationsService extends AbstractIntegrationsService {
  private readonly apiBase = (process.env.PENNYLANE_API_BASE_URL ?? DEFAULT_API_BASE).replace(
    /\/$/,
    "",
  );
  private readonly oauthAuthorizeUrl = (
    process.env.PENNYLANE_OAUTH_AUTHORIZE_URL ?? DEFAULT_OAUTH_AUTHORIZE
  ).replace(/\/$/, "");
  private readonly oauthTokenUrl = (
    process.env.PENNYLANE_OAUTH_TOKEN_URL ?? DEFAULT_OAUTH_TOKEN
  ).replace(/\/$/, "");
  private readonly oauthRevokeUrl = (
    process.env.PENNYLANE_OAUTH_REVOKE_URL ?? DEFAULT_OAUTH_REVOKE
  ).replace(/\/$/, "");
  private readonly qontoApiBase = (
    process.env.QONTO_API_BASE_URL ?? DEFAULT_QONTO_API_BASE
  ).replace(/\/$/, "");
  private readonly qontoOauthAuthorizeUrl = (
    process.env.QONTO_OAUTH_AUTHORIZE_URL ?? DEFAULT_QONTO_OAUTH_AUTHORIZE
  ).replace(/\/$/, "");
  private readonly qontoOauthTokenUrl = (
    process.env.QONTO_OAUTH_TOKEN_URL ?? DEFAULT_QONTO_OAUTH_TOKEN
  ).replace(/\/$/, "");
  private readonly refreshLocks = new Map<string, Promise<string>>();
  private readonly qontoRefreshLocks = new Map<string, Promise<string>>();

  constructor(
    private readonly httpService: HttpService,
    @InjectModel("IntegrationCredential")
    private readonly credentialModel: Model<IntegrationCredentialDocument>,
    @InjectModel("IntegrationSync")
    private readonly syncModel: Model<IntegrationSyncDocument>,
  ) {
    super();
  }

  async getPennylaneStatus(organizationId: string): Promise<PennylaneConnectionStatus> {
    const orgId = requireOrganizationId(organizationId);
    const oauthAvailable = this.isOAuthConfigured();
    const doc = await this.credentialModel
      .findOne({ ...organizationScopeFilter(orgId), provider: PROVIDER })
      .exec();
    if (!doc) {
      return { provider: PROVIDER, connected: false, oauthAvailable };
    }
    return {
      provider: PROVIDER,
      connected: true,
      companyId: doc.companyId,
      companyName: doc.companyName,
      connectedAt: doc.connectedAt?.toISOString(),
      tokenHint: doc.tokenHint,
      authMethod: doc.authMethod === "oauth" ? "oauth" : "api_token",
      oauthAvailable,
    };
  }

  async startPennylaneOAuth(organizationId: string): Promise<PennylaneOAuthStartResponse> {
    const orgId = requireOrganizationId(organizationId);
    const config = this.requireOAuthConfig();
    const state = signOAuthState(orgId);
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: config.scopes,
      state,
    });
    return { authorizationUrl: `${this.oauthAuthorizeUrl}?${params.toString()}` };
  }

  async completePennylaneOAuth(
    body: CompletePennylaneOAuthBody,
  ): Promise<PennylaneConnectionStatus> {
    const orgId = requireOrganizationId(body.organizationId);
    const code = body.code?.trim();
    const state = body.state?.trim();
    if (!code || !state) {
      throw new BadRequestException("code et state OAuth sont requis.");
    }

    let stateOrg: string;
    try {
      stateOrg = verifyOAuthState(state).organizationId;
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : "State OAuth invalide.");
    }
    if (stateOrg !== orgId) {
      throw new BadRequestException("Le state OAuth ne correspond pas à votre organisation.");
    }

    const tokens = await this.exchangeAuthorizationCode(code);
    return this.persistOAuthTokens(orgId, tokens);
  }

  async connectPennylane(body: ConnectPennylaneBody): Promise<PennylaneConnectionStatus> {
    const orgId = requireOrganizationId(body.organizationId);
    const apiToken = body.apiToken?.trim();
    if (!apiToken) {
      throw new BadRequestException("Le token API Pennylane est requis.");
    }

    const me = await this.pennylaneGet<{ id?: string | number; name?: string; email?: string }>(
      apiToken,
      "/me",
    );

    const now = new Date();
    await this.credentialModel
      .findOneAndUpdate(
        { organizationId: orgId, provider: PROVIDER },
        {
          organizationId: orgId,
          provider: PROVIDER,
          authMethod: "api_token",
          encryptedToken: encryptSecret(apiToken),
          tokenHint: tokenHint(apiToken),
          encryptedRefreshToken: null,
          accessTokenExpiresAt: null,
          companyId: me.id != null ? String(me.id) : undefined,
          companyName: me.name || me.email,
          connectedAt: now,
        },
        { upsert: true, new: true },
      )
      .exec();

    await this.clearOtherBillingIntegration(orgId, PROVIDER);
    return this.getPennylaneStatus(orgId);
  }

  async disconnectPennylane(organizationId: string): Promise<PennylaneConnectionStatus> {
    const orgId = requireOrganizationId(organizationId);
    const doc = await this.credentialModel
      .findOne({ ...organizationScopeFilter(orgId), provider: PROVIDER })
      .exec();
    if (doc?.authMethod === "oauth") {
      await this.revokeOAuthTokenBestEffort(doc);
    }
    await this.credentialModel
      .deleteOne({ ...organizationScopeFilter(orgId), provider: PROVIDER })
      .exec();
    return { provider: PROVIDER, connected: false, oauthAvailable: this.isOAuthConfigured() };
  }

  async syncCaseToPennylane(body: SyncCaseToPennylaneBody): Promise<SyncCaseToPennylaneResult> {
    const orgId = requireOrganizationId(body.organizationId);
    if (!body.caseId?.trim()) {
      throw new BadRequestException("caseId est requis.");
    }
    if (!body.lines?.length) {
      throw new BadRequestException("Au moins une ligne de facture est requise.");
    }

    const existing = await this.syncModel
      .findOne({
        ...organizationScopeFilter(orgId),
        provider: PROVIDER,
        caseId: body.caseId,
      })
      .exec();
    if (existing) {
      return {
        provider: PROVIDER,
        caseId: body.caseId,
        pennylaneCustomerId: existing.pennylaneCustomerId,
        pennylaneInvoiceId: existing.pennylaneInvoiceId,
        draft: existing.draft,
        invoiceUrl: existing.invoiceUrl,
      };
    }

    const token = await this.requireAccessToken(orgId);
    const customerId = await this.ensurePennylaneCustomer(token, body);
    const draft = body.draft !== false;

    const invoicePayload = {
      date: body.invoiceDate,
      deadline: body.deadline ?? body.invoiceDate,
      draft,
      customer_id: Number.isFinite(Number(customerId)) ? Number(customerId) : customerId,
      external_reference: body.externalReference,
      invoice_lines: body.lines.map((line) => ({
        label: line.label.slice(0, 255),
        quantity: line.quantity,
        raw_currency_unit_price: line.unitPriceHt,
        vat_rate: line.vatRate,
        ...(line.unit ? { unit: line.unit } : {}),
      })),
    };

    const created = await this.pennylanePost<{
      id?: string | number;
      invoice?: { id?: string | number; public_url?: string; url?: string };
      public_url?: string;
      url?: string;
    }>(token, "/customer_invoices", invoicePayload);

    const invoiceId = String(created.id ?? created.invoice?.id ?? "");
    if (!invoiceId) {
      throw new ServiceUnavailableException("Pennylane n’a pas renvoyé d’identifiant de facture.");
    }

    const invoiceUrl =
      created.public_url || created.url || created.invoice?.public_url || created.invoice?.url;

    await this.syncModel.create({
      organizationId: orgId,
      provider: PROVIDER,
      caseId: body.caseId,
      externalReference: body.externalReference,
      pennylaneCustomerId: String(customerId),
      pennylaneInvoiceId: invoiceId,
      draft,
      invoiceUrl,
    });

    return {
      provider: PROVIDER,
      caseId: body.caseId,
      pennylaneCustomerId: String(customerId),
      pennylaneInvoiceId: invoiceId,
      draft,
      invoiceUrl,
    };
  }

  private isOAuthConfigured(): boolean {
    return Boolean(
      process.env.PENNYLANE_CLIENT_ID?.trim() &&
      process.env.PENNYLANE_CLIENT_SECRET?.trim() &&
      this.resolveRedirectUri(),
    );
  }

  private requireOAuthConfig(): {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes: string;
  } {
    const clientId = process.env.PENNYLANE_CLIENT_ID?.trim();
    const clientSecret = process.env.PENNYLANE_CLIENT_SECRET?.trim();
    const redirectUri = this.resolveRedirectUri();
    if (!clientId || !clientSecret || !redirectUri) {
      throw new ServiceUnavailableException(
        "OAuth Pennylane non configuré (PENNYLANE_CLIENT_ID / SECRET / redirect).",
      );
    }
    return {
      clientId,
      clientSecret,
      redirectUri,
      scopes: (process.env.PENNYLANE_OAUTH_SCOPES ?? DEFAULT_SCOPES).trim(),
    };
  }

  private resolveRedirectUri(): string | undefined {
    const explicit = process.env.PENNYLANE_OAUTH_REDIRECT_URI?.trim();
    if (explicit) return explicit;
    const appUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");
    if (!appUrl) return undefined;
    return `${appUrl}/settings/integrations/pennylane/callback`;
  }

  private async exchangeAuthorizationCode(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const config = this.requireOAuthConfig();
    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    });
    return this.requestOAuthTokens(body);
  }

  private async requestOAuthTokens(body: URLSearchParams): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    try {
      const res = await firstValueFrom(
        this.httpService.post<{
          access_token?: string;
          refresh_token?: string;
          expires_in?: number;
        }>(this.oauthTokenUrl, body.toString(), {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          timeout: 30000,
        }),
      );
      const accessToken = res.data.access_token?.trim();
      const refreshToken = res.data.refresh_token?.trim();
      const expiresIn = Number(res.data.expires_in ?? 86400);
      if (!accessToken || !refreshToken) {
        throw new ServiceUnavailableException(
          "Pennylane n’a pas renvoyé access_token / refresh_token.",
        );
      }
      return { accessToken, refreshToken, expiresIn };
    } catch (err) {
      if (err instanceof ServiceUnavailableException || err instanceof BadRequestException) {
        throw err;
      }
      this.rethrowPennylane(err);
    }
  }

  private async persistOAuthTokens(
    orgId: string,
    tokens: { accessToken: string; refreshToken: string; expiresIn: number },
  ): Promise<PennylaneConnectionStatus> {
    const me = await this.pennylaneGet<{ id?: string | number; name?: string; email?: string }>(
      tokens.accessToken,
      "/me",
    );
    const now = new Date();
    const expiresAt = new Date(now.getTime() + Math.max(60, tokens.expiresIn) * 1000);

    await this.credentialModel
      .findOneAndUpdate(
        { organizationId: orgId, provider: PROVIDER },
        {
          organizationId: orgId,
          provider: PROVIDER,
          authMethod: "oauth",
          encryptedToken: encryptSecret(tokens.accessToken),
          encryptedRefreshToken: encryptSecret(tokens.refreshToken),
          accessTokenExpiresAt: expiresAt,
          tokenHint: tokenHint(tokens.accessToken),
          companyId: me.id != null ? String(me.id) : undefined,
          companyName: me.name || me.email,
          connectedAt: now,
        },
        { upsert: true, new: true },
      )
      .exec();

    await this.clearOtherBillingIntegration(orgId, PROVIDER);
    return this.getPennylaneStatus(orgId);
  }

  private async requireAccessToken(organizationId: string): Promise<string> {
    const doc = await this.credentialModel
      .findOne({ ...organizationScopeFilter(organizationId), provider: PROVIDER })
      .exec();
    if (!doc) {
      throw new NotFoundException(
        "Pennylane n’est pas connecté. Connectez-le dans Paramètres → Intégrations.",
      );
    }

    if (doc.authMethod !== "oauth") {
      return decryptSecret(doc.encryptedToken);
    }

    const expiresAt = doc.accessTokenExpiresAt?.getTime() ?? 0;
    if (expiresAt > Date.now() + REFRESH_SKEW_MS) {
      return decryptSecret(doc.encryptedToken);
    }

    return this.refreshAccessTokenLocked(organizationId, doc);
  }

  private async refreshAccessTokenLocked(
    organizationId: string,
    doc: IntegrationCredentialDocument,
  ): Promise<string> {
    const existing = this.refreshLocks.get(organizationId);
    if (existing) return existing;

    const promise = this.refreshAccessToken(doc).finally(() => {
      this.refreshLocks.delete(organizationId);
    });
    this.refreshLocks.set(organizationId, promise);
    return promise;
  }

  private async refreshAccessToken(doc: IntegrationCredentialDocument): Promise<string> {
    if (!doc.encryptedRefreshToken) {
      throw new BadRequestException(
        "Session Pennylane expirée. Reconnectez Pennylane dans Paramètres → Intégrations.",
      );
    }
    const config = this.requireOAuthConfig();
    const refreshToken = decryptSecret(doc.encryptedRefreshToken);
    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    let tokens: { accessToken: string; refreshToken: string; expiresIn: number };
    try {
      tokens = await this.requestOAuthTokens(body);
    } catch {
      throw new BadRequestException(
        "Session Pennylane expirée. Reconnectez Pennylane dans Paramètres → Intégrations.",
      );
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + Math.max(60, tokens.expiresIn) * 1000);
    await this.credentialModel
      .findOneAndUpdate(
        { _id: doc._id },
        {
          encryptedToken: encryptSecret(tokens.accessToken),
          encryptedRefreshToken: encryptSecret(tokens.refreshToken),
          accessTokenExpiresAt: expiresAt,
          tokenHint: tokenHint(tokens.accessToken),
        },
      )
      .exec();

    return tokens.accessToken;
  }

  private async revokeOAuthTokenBestEffort(doc: IntegrationCredentialDocument): Promise<void> {
    try {
      const config = this.requireOAuthConfig();
      const token = doc.encryptedRefreshToken
        ? decryptSecret(doc.encryptedRefreshToken)
        : decryptSecret(doc.encryptedToken);
      const body = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        token,
      });
      await firstValueFrom(
        this.httpService.post(this.oauthRevokeUrl, body.toString(), {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          timeout: 15000,
          validateStatus: () => true,
        }),
      );
    } catch {
      /* best effort */
    }
  }

  private async ensurePennylaneCustomer(
    token: string,
    body: SyncCaseToPennylaneBody,
  ): Promise<string> {
    const externalRef = `planwise-customer-${body.customer.planwiseCustomerId}`;

    try {
      const listed = await this.pennylaneGet<{
        items?: Array<{ id?: string | number; external_reference?: string }>;
        customers?: Array<{ id?: string | number; external_reference?: string }>;
      }>(token, `/company_customers?filter[external_reference]=${encodeURIComponent(externalRef)}`);

      const items = listed.items ?? listed.customers ?? [];
      const match = items.find((c) => c.external_reference === externalRef || c.id != null);
      if (match?.id != null) return String(match.id);
    } catch {
      /* fallback create */
    }

    const created = await this.pennylanePost<{
      id?: string | number;
      customer?: { id?: string | number };
    }>(token, "/company_customers", {
      name: body.customer.name,
      external_reference: externalRef,
      ...(body.customer.email ? { emails: [{ value: body.customer.email, primary: true }] } : {}),
      ...(body.customer.vatNumber ? { vat_number: body.customer.vatNumber } : {}),
      billing_address: {
        address: [body.customer.addressLine1, body.customer.addressLine2]
          .filter(Boolean)
          .join(", "),
        postal_code: body.customer.postalCode ?? "",
        city: body.customer.city ?? "",
        country_alpha2: (body.customer.country || "FR").slice(0, 2).toUpperCase(),
      },
    });

    const id = created.id ?? created.customer?.id;
    if (id == null) {
      throw new ServiceUnavailableException("Pennylane n’a pas renvoyé d’identifiant client.");
    }
    return String(id);
  }

  private async pennylaneGet<T>(token: string, path: string): Promise<T> {
    try {
      const res = await firstValueFrom(
        this.httpService.get<T>(`${this.apiBase}${path}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          timeout: 30000,
        }),
      );
      return res.data;
    } catch (err) {
      this.rethrowPennylane(err);
    }
  }

  private async pennylanePost<T>(token: string, path: string, body: unknown): Promise<T> {
    try {
      const res = await firstValueFrom(
        this.httpService.post<T>(`${this.apiBase}${path}`, body, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }),
      );
      return res.data;
    } catch (err) {
      this.rethrowPennylane(err);
    }
  }

  private rethrowPennylane(err: unknown): never {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const data = err.response?.data as
        | { message?: string | string[]; error?: string; error_description?: string }
        | undefined;
      const raw = data?.message ?? data?.error_description ?? data?.error;
      const message = Array.isArray(raw)
        ? raw.join(", ")
        : typeof raw === "string"
          ? raw
          : err.message || "Erreur Pennylane";
      if (status === 401 || status === 403) {
        throw new BadRequestException(
          `Pennylane a refusé l’accès (${status}). Reconnectez Pennylane dans Paramètres → Intégrations.`,
        );
      }
      if (status === 404) {
        throw new NotFoundException(message);
      }
      if (status && status >= 400 && status < 500) {
        throw new BadRequestException(message);
      }
      throw new ServiceUnavailableException(`Pennylane indisponible : ${message}`);
    }
    throw err;
  }

  // ── Qonto ──────────────────────────────────────────────────────────

  async getQontoStatus(organizationId: string): Promise<QontoConnectionStatus> {
    const orgId = requireOrganizationId(organizationId);
    const oauthAvailable = this.isQontoOAuthConfigured();
    const doc = await this.credentialModel
      .findOne({ ...organizationScopeFilter(orgId), provider: QONTO_PROVIDER })
      .exec();
    if (!doc) {
      return { provider: QONTO_PROVIDER, connected: false, oauthAvailable };
    }
    return {
      provider: QONTO_PROVIDER,
      connected: true,
      companyId: doc.companyId,
      companyName: doc.companyName,
      connectedAt: doc.connectedAt?.toISOString(),
      tokenHint: doc.tokenHint,
      authMethod: doc.authMethod === "oauth" ? "oauth" : "api_token",
      oauthAvailable,
    };
  }

  async startQontoOAuth(organizationId: string): Promise<QontoOAuthStartResponse> {
    const orgId = requireOrganizationId(organizationId);
    const config = this.requireQontoOAuthConfig();
    const state = signOAuthState(orgId);
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: "code",
      scope: config.scopes,
      state,
    });
    return { authorizationUrl: `${this.qontoOauthAuthorizeUrl}?${params.toString()}` };
  }

  async completeQontoOAuth(body: CompleteQontoOAuthBody): Promise<QontoConnectionStatus> {
    const orgId = requireOrganizationId(body.organizationId);
    const code = body.code?.trim();
    const state = body.state?.trim();
    if (!code || !state) {
      throw new BadRequestException("code et state OAuth sont requis.");
    }

    let stateOrg: string;
    try {
      stateOrg = verifyOAuthState(state).organizationId;
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : "State OAuth invalide.");
    }
    if (stateOrg !== orgId) {
      throw new BadRequestException("Le state OAuth ne correspond pas à votre organisation.");
    }

    const tokens = await this.exchangeQontoAuthorizationCode(code);
    return this.persistQontoOAuthTokens(orgId, tokens);
  }

  async connectQonto(body: ConnectQontoBody): Promise<QontoConnectionStatus> {
    const orgId = requireOrganizationId(body.organizationId);
    const login = body.login?.trim();
    const secretKey = body.secretKey?.trim();
    if (!login || !secretKey) {
      throw new BadRequestException("Le login et la clé secrète Qonto sont requis.");
    }

    const authHeader = `${login}:${secretKey}`;
    const org = await this.qontoGetOrganization(authHeader);
    const now = new Date();
    await this.credentialModel
      .findOneAndUpdate(
        { organizationId: orgId, provider: QONTO_PROVIDER },
        {
          organizationId: orgId,
          provider: QONTO_PROVIDER,
          authMethod: "api_token",
          encryptedToken: encryptSecret(authHeader),
          tokenHint: tokenHint(secretKey),
          encryptedRefreshToken: null,
          accessTokenExpiresAt: null,
          companyId: org.id,
          companyName: org.name,
          connectedAt: now,
        },
        { upsert: true, new: true },
      )
      .exec();

    await this.clearOtherBillingIntegration(orgId, QONTO_PROVIDER);
    return this.getQontoStatus(orgId);
  }

  async disconnectQonto(organizationId: string): Promise<QontoConnectionStatus> {
    const orgId = requireOrganizationId(organizationId);
    await this.credentialModel
      .deleteOne({ ...organizationScopeFilter(orgId), provider: QONTO_PROVIDER })
      .exec();
    return {
      provider: QONTO_PROVIDER,
      connected: false,
      oauthAvailable: this.isQontoOAuthConfigured(),
    };
  }

  async syncCaseToQonto(body: SyncCaseToQontoBody): Promise<SyncCaseToQontoResult> {
    const orgId = requireOrganizationId(body.organizationId);
    if (!body.caseId?.trim()) {
      throw new BadRequestException("caseId est requis.");
    }
    if (!body.lines?.length) {
      throw new BadRequestException("Au moins une ligne de facture est requise.");
    }

    const existing = await this.syncModel
      .findOne({
        ...organizationScopeFilter(orgId),
        provider: QONTO_PROVIDER,
        caseId: body.caseId,
      })
      .exec();
    if (existing) {
      return {
        provider: QONTO_PROVIDER,
        caseId: body.caseId,
        qontoCustomerId: existing.pennylaneCustomerId,
        qontoInvoiceId: existing.pennylaneInvoiceId,
        draft: existing.draft,
        invoiceUrl: existing.invoiceUrl,
      };
    }

    const taxId = resolveQontoTaxId(body.customer.legalIdentifier, body.customer.vatNumber);
    if (body.customer.kind === "company" && !taxId) {
      throw new BadRequestException(
        "Le client (personne morale) doit avoir un SIREN ou SIRET pour créer une facture Qonto. Complétez l’identifiant légal sur la fiche client, puis réessayez.",
      );
    }

    const authorization = await this.requireQontoAccessAuthorization(orgId);
    const clientId = await this.ensureQontoClient(authorization, body);
    const iban = await this.requireQontoReceivingIban(authorization);
    const draft = body.draft !== false;
    const dueDate = body.deadline ?? addDaysIso(body.invoiceDate, 30);
    const invoiceNumber = body.invoiceNumber?.trim();

    const created = await this.qontoPost<{
      client_invoice?: { id?: string; invoice_url?: string; status?: string };
    }>(authorization, "/client_invoices", {
      client_id: clientId,
      issue_date: body.invoiceDate,
      due_date: dueDate,
      status: draft ? "draft" : "unpaid",
      currency: "EUR",
      // Sans `number` : numérotation automatique Qonto.
      // Si elle est désactivée, le client peut renvoyer un `invoiceNumber`.
      ...(invoiceNumber ? { number: invoiceNumber.slice(0, 40) } : {}),
      purchase_order: body.externalReference.slice(0, 40),
      header: body.caseTitle.slice(0, 200),
      payment_methods: { iban },
      items: body.lines.map((line) => ({
        title: line.label.slice(0, 40),
        description: line.label.length > 40 ? line.label.slice(0, 1800) : undefined,
        quantity: String(line.quantity),
        ...(line.unit ? { unit: line.unit.slice(0, 20) } : {}),
        unit_price: { value: line.unitPriceHt, currency: "EUR" },
        vat_rate: line.vatRate,
      })),
    });

    const invoice = created.client_invoice;
    const invoiceId = invoice?.id?.trim();
    if (!invoiceId) {
      throw new ServiceUnavailableException("Qonto n’a pas renvoyé d’identifiant de facture.");
    }
    const invoiceUrl = invoice?.invoice_url;

    await this.syncModel.create({
      organizationId: orgId,
      provider: QONTO_PROVIDER,
      caseId: body.caseId,
      externalReference: body.externalReference,
      pennylaneCustomerId: clientId,
      pennylaneInvoiceId: invoiceId,
      draft,
      invoiceUrl,
    });

    return {
      provider: QONTO_PROVIDER,
      caseId: body.caseId,
      qontoCustomerId: clientId,
      qontoInvoiceId: invoiceId,
      draft,
      invoiceUrl,
    };
  }

  private isQontoOAuthConfigured(): boolean {
    return Boolean(
      process.env.QONTO_CLIENT_ID?.trim() &&
      process.env.QONTO_CLIENT_SECRET?.trim() &&
      this.resolveQontoRedirectUri(),
    );
  }

  private requireQontoOAuthConfig(): {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    scopes: string;
  } {
    const clientId = process.env.QONTO_CLIENT_ID?.trim();
    const clientSecret = process.env.QONTO_CLIENT_SECRET?.trim();
    const redirectUri = this.resolveQontoRedirectUri();
    if (!clientId || !clientSecret || !redirectUri) {
      throw new ServiceUnavailableException(
        "OAuth Qonto non configuré sur la plateforme (QONTO_CLIENT_ID / SECRET / redirect).",
      );
    }
    return {
      clientId,
      clientSecret,
      redirectUri,
      scopes: (process.env.QONTO_OAUTH_SCOPES ?? DEFAULT_QONTO_SCOPES).trim(),
    };
  }

  private resolveQontoRedirectUri(): string | undefined {
    const explicit = process.env.QONTO_OAUTH_REDIRECT_URI?.trim();
    if (explicit) return explicit;
    const appUrl = (process.env.APP_URL ?? "").replace(/\/$/, "");
    if (!appUrl) return undefined;
    return `${appUrl}/settings/integrations/qonto/callback`;
  }

  private async exchangeQontoAuthorizationCode(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const config = this.requireQontoOAuthConfig();
    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    });
    return this.requestQontoOAuthTokens(body);
  }

  private async requestQontoOAuthTokens(body: URLSearchParams): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    try {
      const res = await firstValueFrom(
        this.httpService.post<{
          access_token?: string;
          refresh_token?: string;
          expires_in?: number;
        }>(this.qontoOauthTokenUrl, body.toString(), {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
            ...this.qontoStagingHeaders(),
          },
          timeout: 30000,
        }),
      );
      const accessToken = res.data.access_token?.trim();
      const refreshToken = res.data.refresh_token?.trim();
      const expiresIn = Number(res.data.expires_in ?? 3600);
      if (!accessToken || !refreshToken) {
        throw new ServiceUnavailableException(
          "Qonto n’a pas renvoyé access_token / refresh_token (scope offline_access requis).",
        );
      }
      return { accessToken, refreshToken, expiresIn };
    } catch (err) {
      if (err instanceof ServiceUnavailableException || err instanceof BadRequestException) {
        throw err;
      }
      this.rethrowQonto(err);
    }
  }

  private async persistQontoOAuthTokens(
    orgId: string,
    tokens: { accessToken: string; refreshToken: string; expiresIn: number },
  ): Promise<QontoConnectionStatus> {
    const org = await this.qontoGetOrganization(`Bearer ${tokens.accessToken}`);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + Math.max(60, tokens.expiresIn) * 1000);

    await this.credentialModel
      .findOneAndUpdate(
        { organizationId: orgId, provider: QONTO_PROVIDER },
        {
          organizationId: orgId,
          provider: QONTO_PROVIDER,
          authMethod: "oauth",
          encryptedToken: encryptSecret(tokens.accessToken),
          encryptedRefreshToken: encryptSecret(tokens.refreshToken),
          accessTokenExpiresAt: expiresAt,
          tokenHint: tokenHint(tokens.accessToken),
          companyId: org.id,
          companyName: org.name,
          connectedAt: now,
        },
        { upsert: true, new: true },
      )
      .exec();

    await this.clearOtherBillingIntegration(orgId, QONTO_PROVIDER);
    return this.getQontoStatus(orgId);
  }

  /** Une seule intégration de facturation active à la fois (Pennylane XOR Qonto). */
  private async clearOtherBillingIntegration(
    organizationId: string,
    keepProvider: "pennylane" | "qonto",
  ): Promise<void> {
    const otherProvider = keepProvider === "pennylane" ? QONTO_PROVIDER : PROVIDER;
    if (otherProvider === PROVIDER) {
      const doc = await this.credentialModel
        .findOne({ ...organizationScopeFilter(organizationId), provider: PROVIDER })
        .exec();
      if (doc?.authMethod === "oauth") {
        await this.revokeOAuthTokenBestEffort(doc);
      }
    }
    await this.credentialModel
      .deleteOne({ ...organizationScopeFilter(organizationId), provider: otherProvider })
      .exec();
  }

  private async requireQontoAccessAuthorization(organizationId: string): Promise<string> {
    const doc = await this.credentialModel
      .findOne({ ...organizationScopeFilter(organizationId), provider: QONTO_PROVIDER })
      .exec();
    if (!doc) {
      throw new NotFoundException(
        "Qonto n’est pas connecté. Connectez-le dans Paramètres → Intégrations.",
      );
    }

    if (doc.authMethod !== "oauth") {
      return decryptSecret(doc.encryptedToken);
    }

    const expiresAt = doc.accessTokenExpiresAt?.getTime() ?? 0;
    if (expiresAt > Date.now() + REFRESH_SKEW_MS) {
      return `Bearer ${decryptSecret(doc.encryptedToken)}`;
    }

    const accessToken = await this.refreshQontoAccessTokenLocked(organizationId, doc);
    return `Bearer ${accessToken}`;
  }

  private async refreshQontoAccessTokenLocked(
    organizationId: string,
    doc: IntegrationCredentialDocument,
  ): Promise<string> {
    const existing = this.qontoRefreshLocks.get(organizationId);
    if (existing) return existing;

    const promise = this.refreshQontoAccessToken(doc).finally(() => {
      this.qontoRefreshLocks.delete(organizationId);
    });
    this.qontoRefreshLocks.set(organizationId, promise);
    return promise;
  }

  private async refreshQontoAccessToken(doc: IntegrationCredentialDocument): Promise<string> {
    if (!doc.encryptedRefreshToken) {
      throw new BadRequestException(
        "Session Qonto expirée. Reconnectez Qonto dans Paramètres → Intégrations.",
      );
    }
    const config = this.requireQontoOAuthConfig();
    const refreshToken = decryptSecret(doc.encryptedRefreshToken);
    const body = new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    const tokens = await this.requestQontoOAuthTokens(body);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + Math.max(60, tokens.expiresIn) * 1000);
    await this.credentialModel
      .updateOne(
        { _id: doc._id },
        {
          $set: {
            encryptedToken: encryptSecret(tokens.accessToken),
            encryptedRefreshToken: encryptSecret(tokens.refreshToken),
            accessTokenExpiresAt: expiresAt,
            tokenHint: tokenHint(tokens.accessToken),
          },
        },
      )
      .exec();
    return tokens.accessToken;
  }

  private async ensureQontoClient(
    authorization: string,
    body: SyncCaseToQontoBody,
  ): Promise<string> {
    const taxId = resolveQontoTaxId(body.customer.legalIdentifier, body.customer.vatNumber);
    const email = body.customer.email?.trim().toLowerCase();
    if (email) {
      try {
        const listed = await this.qontoGet<{
          clients?: Array<{ id?: string; email?: string; tax_identification_number?: string }>;
        }>(authorization, `/clients?filter[email]=${encodeURIComponent(email)}&per_page=5`);
        const match = listed.clients?.find((c) => c.id && c.email?.toLowerCase() === email);
        if (match?.id) {
          if (taxId) {
            await this.ensureQontoClientTaxId(authorization, match.id, taxId);
          }
          return match.id;
        }
      } catch (err) {
        if (err instanceof BadRequestException) throw err;
        /* fallback create */
      }
    }

    const country = (body.customer.country || "FR").slice(0, 2).toUpperCase();
    const street = [body.customer.addressLine1, body.customer.addressLine2]
      .filter(Boolean)
      .join(", ")
      .slice(0, 250);

    const payload: Record<string, unknown> = {
      kind: body.customer.kind === "individual" ? "individual" : "company",
      currency: "EUR",
      locale: "fr",
      ...(email ? { email } : {}),
      ...(taxId ? { tax_identification_number: taxId } : {}),
      // Les particuliers n’ont pas de n° TVA ; Qonto le refuse pour kind=individual.
      ...(body.customer.kind === "company" && body.customer.vatNumber
        ? { vat_number: body.customer.vatNumber }
        : {}),
      billing_address: {
        street_address: street || "Adresse non renseignée",
        city: (body.customer.city || "Paris").slice(0, 50),
        zip_code: (body.customer.postalCode || "75001").slice(0, 20),
        country_code: country,
      },
    };

    if (body.customer.kind === "individual") {
      payload.first_name = (body.customer.firstName || body.customer.name).slice(0, 60);
      payload.last_name = (body.customer.lastName || "-").slice(0, 60);
    } else {
      payload.name = body.customer.name.slice(0, 250);
    }

    const created = await this.qontoPost<{ client?: { id?: string } }>(
      authorization,
      "/clients",
      payload,
    );
    const id = created.client?.id;
    if (!id) {
      throw new ServiceUnavailableException("Qonto n’a pas renvoyé d’identifiant client.");
    }
    return id;
  }

  /** Qonto refuse la facture si le client n’a pas de TIN (SIREN/SIRET). */
  private async ensureQontoClientTaxId(
    authorization: string,
    clientId: string,
    taxId: string,
  ): Promise<void> {
    try {
      const existing = await this.qontoGet<{
        client?: { tax_identification_number?: string | null };
      }>(authorization, `/clients/${clientId}`);
      if (existing.client?.tax_identification_number?.trim()) return;
    } catch {
      /* tenter la mise à jour quand même */
    }

    await this.qontoPatch(authorization, `/clients/${clientId}`, {
      tax_identification_number: taxId,
    });
  }

  private async requireQontoReceivingIban(authorization: string): Promise<string> {
    const org = await this.qontoGet<{
      organization?: {
        bank_accounts?: Array<{ iban?: string; status?: string; main?: boolean }>;
      };
    }>(authorization, "/organization");

    let accounts = org.organization?.bank_accounts ?? [];
    if (!accounts.some((a) => a.iban?.trim())) {
      try {
        const listed = await this.qontoGet<{
          bank_accounts?: Array<{ iban?: string; status?: string; main?: boolean }>;
        }>(authorization, "/bank_accounts?per_page=50");
        accounts = listed.bank_accounts ?? [];
      } catch {
        /* keep empty */
      }
    }

    const preferred =
      accounts.find((a) => a.main && a.iban) ?? accounts.find((a) => a.iban?.trim());
    const iban = preferred?.iban?.replace(/\s+/g, "").trim();
    if (!iban) {
      throw new BadRequestException(
        "Aucun IBAN Qonto disponible. Vérifiez qu’un compte bancaire est actif sur votre organisation Qonto.",
      );
    }
    return iban;
  }

  /** Header obligatoire sur toutes les requêtes sandbox Qonto (gate OneLogin). */
  private qontoStagingHeaders(): Record<string, string> {
    const token = process.env.QONTO_STAGING_TOKEN?.trim();
    return token ? { "X-Qonto-Staging-Token": token } : {};
  }

  private async qontoGetOrganization(
    authorization: string,
  ): Promise<{ id?: string; name?: string }> {
    const res = await this.qontoGet<{
      organization?: { id?: string; name?: string; slug?: string };
      id?: string;
      name?: string;
    }>(authorization, "/organization");
    const org = res.organization ?? res;
    return {
      id: org.id != null ? String(org.id) : undefined,
      name: org.name || (org as { slug?: string }).slug,
    };
  }

  private async qontoGet<T>(authorization: string, path: string): Promise<T> {
    try {
      const res = await firstValueFrom(
        this.httpService.get<T>(`${this.qontoApiBase}${path}`, {
          headers: {
            Authorization: authorization,
            Accept: "application/json",
            ...this.qontoStagingHeaders(),
          },
          timeout: 30000,
        }),
      );
      return res.data;
    } catch (err) {
      this.rethrowQonto(err);
    }
  }

  private async qontoPost<T>(authorization: string, path: string, body: unknown): Promise<T> {
    try {
      const res = await firstValueFrom(
        this.httpService.post<T>(`${this.qontoApiBase}${path}`, body, {
          headers: {
            Authorization: authorization,
            Accept: "application/json",
            "Content-Type": "application/json",
            ...this.qontoStagingHeaders(),
          },
          timeout: 30000,
        }),
      );
      return res.data;
    } catch (err) {
      this.rethrowQonto(err);
    }
  }

  private async qontoPatch<T>(authorization: string, path: string, body: unknown): Promise<T> {
    try {
      const res = await firstValueFrom(
        this.httpService.patch<T>(`${this.qontoApiBase}${path}`, body, {
          headers: {
            Authorization: authorization,
            Accept: "application/json",
            "Content-Type": "application/json",
            ...this.qontoStagingHeaders(),
          },
          timeout: 30000,
        }),
      );
      return res.data;
    } catch (err) {
      this.rethrowQonto(err);
    }
  }

  private rethrowQonto(err: unknown): never {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const data = err.response?.data as
        | {
            message?: string | string[];
            error?: string;
            error_description?: string;
            errors?: Array<{ detail?: string; title?: string }>;
          }
        | undefined;
      const fromErrors = data?.errors
        ?.map((e) => e.detail || e.title)
        .filter(Boolean)
        .join(", ");
      const raw = fromErrors || data?.message || data?.error_description || data?.error;
      const message = Array.isArray(raw)
        ? raw.join(", ")
        : typeof raw === "string"
          ? raw
          : err.message || "Erreur Qonto";
      if (status === 401 || status === 403) {
        throw new BadRequestException(
          `Qonto a refusé l’accès (${status}). Vérifiez vos identifiants, scopes OAuth (facturation) ou reconnectez Qonto.`,
        );
      }
      if (status === 404) {
        throw new NotFoundException(message);
      }
      if (status && status >= 400 && status < 500) {
        const lower = message.toLowerCase();
        if (lower.includes("`number`") || lower.includes("number must")) {
          throw new BadRequestException(QONTO_INVOICE_NUMBER_REQUIRED_MESSAGE);
        }
        if (
          lower.includes("tin_number") ||
          lower.includes("tax_identification_number") ||
          lower.includes("tax identification")
        ) {
          throw new BadRequestException(
            "Qonto exige un identifiant fiscal sur le client. Pour une personne morale, renseignez le SIREN/SIRET sur la fiche client Planwise.",
          );
        }
        throw new BadRequestException(message);
      }
      throw new ServiceUnavailableException(`Qonto indisponible : ${message}`);
    }
    throw err;
  }
}

function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Extrait un SIREN/SIRET utilisable comme tax_identification_number Qonto. */
function resolveQontoTaxId(legalIdentifier?: string, vatNumber?: string): string | undefined {
  const raw = (legalIdentifier || vatNumber || "").replace(/[\s.]/g, "").toUpperCase();
  if (!raw) return undefined;
  if (/^\d{9}$/.test(raw) || /^\d{14}$/.test(raw)) return raw;
  const vatMatch = raw.match(/^FR[A-Z0-9]{2}(\d{9})$/);
  if (vatMatch) return vatMatch[1];
  if (raw.length <= 20) return raw;
  return undefined;
}
