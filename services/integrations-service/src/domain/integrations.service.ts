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
  ConnectPennylaneBody,
  PennylaneConnectionStatus,
  PennylaneOAuthStartResponse,
  SyncCaseToPennylaneBody,
  SyncCaseToPennylaneResult,
} from "@planwise/shared";
import { organizationScopeFilter, requireOrganizationId } from "@planwise/shared";
import { AbstractIntegrationsService } from "./ports/integrations.service.port";
import {
  IntegrationCredentialDocument,
  IntegrationSyncDocument,
} from "../persistence/integration.schema";
import { decryptSecret, encryptSecret, tokenHint } from "./secret-crypto";
import { signOAuthState, verifyOAuthState } from "./oauth-state";

const PROVIDER = "pennylane";
const DEFAULT_API_BASE = "https://app.pennylane.com/api/external/v2";
const DEFAULT_OAUTH_AUTHORIZE = "https://app.pennylane.com/oauth/authorize";
const DEFAULT_OAUTH_TOKEN = "https://app.pennylane.com/oauth/token";
const DEFAULT_OAUTH_REVOKE = "https://app.pennylane.com/oauth/revoke";
const DEFAULT_SCOPES = "customers:all customer_invoices:all";
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
  private readonly refreshLocks = new Map<string, Promise<string>>();

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
}
