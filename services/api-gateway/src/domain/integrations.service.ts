import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import axios from "axios";
import type {
  AuthUser,
  BillingIntegrationAvailability,
  BillingStatus,
  CaseInvoiceKind,
  CaseInvoiceSyncListResponse,
  CaseInvoiceSyncStatus,
  CaseResponse,
  OrganizationInvoiceSyncItem,
  OrganizationInvoiceSyncStatsResponse,
  OrganizationInvoiceSyncsListResponse,
  ConnectPennylaneBody,
  ConnectQontoBody,
  CustomerResponse,
  PennylaneConnectionStatus,
  PennylaneOAuthStartResponse,
  QontoConnectionStatus,
  QontoOAuthStartResponse,
  QuoteResponse,
  SyncCaseInvoiceOptions,
  SyncCaseToPennylaneBody,
  SyncCaseToPennylaneResult,
  SyncCaseToQontoBody,
  SyncCaseToQontoResult,
  TvaRate,
} from "@planwise/shared";
import {
  aggregateCaseBillingStatus,
  buildInvoiceLinesFromQuote,
  canCreateCaseInvoice,
  nextSituationNumber,
  shouldUpgradeBillingStatus,
  sumInvoiceAmountsHt,
} from "@planwise/shared";
import { AbstractIntegrationsGatewayService } from "./ports/integrations.service.port";
import { AbstractCasesGatewayService } from "./ports/cases.service.port";
import { AbstractCustomersGatewayService } from "./ports/customers.service.port";
import { assertAssignablePermission } from "../infrastructure/permission-checks";

const INTEGRATIONS_URL = process.env.INTEGRATIONS_SERVICE_URL ?? "http://localhost:3013";

const TVA_TO_PENNYLANE: Record<TvaRate, string> = {
  0: "FR_0",
  5.5: "FR_55",
  10: "FR_100",
  20: "FR_200",
};

const TVA_TO_QONTO: Record<TvaRate, string> = {
  0: "0",
  5.5: "0.055",
  10: "0.10",
  20: "0.20",
};

@Injectable()
export class IntegrationsGatewayService extends AbstractIntegrationsGatewayService {
  constructor(
    private readonly httpService: HttpService,
    private readonly casesService: AbstractCasesGatewayService,
    private readonly customersService: AbstractCustomersGatewayService,
  ) {
    super();
  }

  async getPennylaneStatus(user: AuthUser): Promise<PennylaneConnectionStatus> {
    return this.getJson("/integrations/pennylane", {
      organizationId: user.organizationId,
    });
  }

  async startPennylaneOAuth(user: AuthUser): Promise<PennylaneOAuthStartResponse> {
    return this.postJson("/integrations/pennylane/oauth/start", {
      organizationId: user.organizationId,
    });
  }

  async completePennylaneOAuth(
    user: AuthUser,
    body: { code: string; state: string },
  ): Promise<PennylaneConnectionStatus> {
    return this.postJson("/integrations/pennylane/oauth/complete", {
      organizationId: user.organizationId,
      code: body.code,
      state: body.state,
    });
  }

  async connectPennylane(
    user: AuthUser,
    body: Omit<ConnectPennylaneBody, "organizationId">,
  ): Promise<PennylaneConnectionStatus> {
    return this.postJson("/integrations/pennylane/connect", {
      organizationId: user.organizationId,
      apiToken: body.apiToken,
    });
  }

  async disconnectPennylane(user: AuthUser): Promise<PennylaneConnectionStatus> {
    try {
      const res = await firstValueFrom(
        this.httpService.delete<PennylaneConnectionStatus>(
          `${INTEGRATIONS_URL}/integrations/pennylane`,
          { params: { organizationId: user.organizationId } },
        ),
      );
      return res.data;
    } catch (err) {
      this.rethrow(err);
    }
  }

  async getQontoStatus(user: AuthUser): Promise<QontoConnectionStatus> {
    return this.getJson("/integrations/qonto", {
      organizationId: user.organizationId,
    });
  }

  async getBillingIntegrationAvailability(user: AuthUser): Promise<BillingIntegrationAvailability> {
    const [pennylaneResult, qontoResult] = await Promise.allSettled([
      this.getPennylaneStatus(user),
      this.getQontoStatus(user),
    ]);
    const pennylane =
      pennylaneResult.status === "fulfilled" && pennylaneResult.value.connected === true;
    const qonto = qontoResult.status === "fulfilled" && qontoResult.value.connected === true;
    return { connected: pennylane || qonto, pennylane, qonto };
  }

  async startQontoOAuth(user: AuthUser): Promise<QontoOAuthStartResponse> {
    return this.postJson("/integrations/qonto/oauth/start", {
      organizationId: user.organizationId,
    });
  }

  async completeQontoOAuth(
    user: AuthUser,
    body: { code: string; state: string },
  ): Promise<QontoConnectionStatus> {
    return this.postJson("/integrations/qonto/oauth/complete", {
      organizationId: user.organizationId,
      code: body.code,
      state: body.state,
    });
  }

  async connectQonto(
    user: AuthUser,
    body: Omit<ConnectQontoBody, "organizationId">,
  ): Promise<QontoConnectionStatus> {
    return this.postJson("/integrations/qonto/connect", {
      organizationId: user.organizationId,
      login: body.login,
      secretKey: body.secretKey,
    });
  }

  async disconnectQonto(user: AuthUser): Promise<QontoConnectionStatus> {
    try {
      const res = await firstValueFrom(
        this.httpService.delete<QontoConnectionStatus>(`${INTEGRATIONS_URL}/integrations/qonto`, {
          params: { organizationId: user.organizationId },
        }),
      );
      return res.data;
    } catch (err) {
      this.rethrow(err);
    }
  }

  async syncCaseToPennylane(
    user: AuthUser,
    caseId: string,
    options: SyncCaseInvoiceOptions,
  ): Promise<SyncCaseToPennylaneResult> {
    const prepared = await this.prepareInvoiceSync(user, caseId, options, "Pennylane");

    const today = new Date().toISOString().slice(0, 10);
    const payload: SyncCaseToPennylaneBody = {
      organizationId: user.organizationId,
      caseId: prepared.caseData.id,
      caseTitle: prepared.caseData.title,
      externalReference: prepared.externalReference,
      invoiceDate: today,
      draft: true,
      quoteId: prepared.quoteId,
      invoiceKind: prepared.invoiceKind,
      situationNumber: prepared.situationNumber,
      situationPercent: prepared.situationPercent,
      amountHt: prepared.amountHt,
      customer: {
        planwiseCustomerId: prepared.customer.id,
        name: prepared.customer.displayName,
        email: prepared.customer.email,
        vatNumber: prepared.customer.legalIdentifier?.startsWith("FR")
          ? prepared.customer.legalIdentifier
          : undefined,
        addressLine1: prepared.customer.address?.line1,
        addressLine2: prepared.customer.address?.line2,
        postalCode: prepared.customer.address?.postalCode,
        city: prepared.customer.address?.city,
        country: prepared.customer.address?.country || "FR",
      },
      lines: prepared.lines.map((line) => ({
        label: line.label,
        quantity: line.quantity,
        unitPriceHt: line.unitPriceHt,
        vatRate: TVA_TO_PENNYLANE[line.tvaRate] ?? "FR_200",
        unit: line.unit,
      })),
    };

    const result = await this.postJson<SyncCaseToPennylaneResult>(
      "/integrations/pennylane/sync-case",
      payload,
    );

    await this.recomputeCaseBillingStatus(user, caseId, prepared.quoteTotalHt);
    return result;
  }

  async syncCaseToQonto(
    user: AuthUser,
    caseId: string,
    options: SyncCaseInvoiceOptions,
  ): Promise<SyncCaseToQontoResult> {
    const prepared = await this.prepareInvoiceSync(user, caseId, options, "Qonto");
    const today = new Date().toISOString().slice(0, 10);
    const invoiceNumber = options?.invoiceNumber?.trim();

    const payload: SyncCaseToQontoBody = {
      organizationId: user.organizationId,
      caseId: prepared.caseData.id,
      caseTitle: prepared.caseData.title,
      externalReference: prepared.externalReference,
      invoiceDate: today,
      draft: true,
      ...(invoiceNumber ? { invoiceNumber } : {}),
      quoteId: prepared.quoteId,
      invoiceKind: prepared.invoiceKind,
      situationNumber: prepared.situationNumber,
      situationPercent: prepared.situationPercent,
      amountHt: prepared.amountHt,
      customer: {
        planwiseCustomerId: prepared.customer.id,
        kind: prepared.customer.kind,
        name: prepared.customer.displayName,
        firstName: prepared.customer.firstName,
        lastName: prepared.customer.lastName,
        email: prepared.customer.email,
        legalIdentifier: prepared.customer.legalIdentifier,
        addressLine1: prepared.customer.address?.line1,
        addressLine2: prepared.customer.address?.line2,
        postalCode: prepared.customer.address?.postalCode,
        city: prepared.customer.address?.city,
        country: prepared.customer.address?.country || "FR",
      },
      lines: prepared.lines.map((line) => ({
        label: line.label,
        quantity: line.quantity,
        unitPriceHt: line.unitPriceHt,
        vatRate: TVA_TO_QONTO[line.tvaRate] ?? "0.20",
        unit: line.unit,
      })),
    };

    const result = await this.postJson<SyncCaseToQontoResult>(
      "/integrations/qonto/sync-case",
      payload,
    );

    await this.recomputeCaseBillingStatus(user, caseId, prepared.quoteTotalHt);
    return result;
  }

  async listOrganizationInvoiceSyncs(
    user: AuthUser,
    filters?: {
      remoteStatus?: string;
      provider?: string;
      invoiceKind?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<OrganizationInvoiceSyncsListResponse> {
    const params: Record<string, string> = { organizationId: user.organizationId };
    if (filters?.remoteStatus) params.remoteStatus = filters.remoteStatus;
    if (filters?.provider) params.provider = filters.provider;
    if (filters?.invoiceKind) params.invoiceKind = filters.invoiceKind;
    if (filters?.startDate) params.startDate = filters.startDate;
    if (filters?.endDate) params.endDate = filters.endDate;
    if (filters?.limit != null) params.limit = String(filters.limit);
    if (filters?.offset != null) params.offset = String(filters.offset);

    const raw = await this.getJson<OrganizationInvoiceSyncsListResponse>(
      "/integrations/invoice-syncs",
      params,
    );
    if (raw.invoices.length === 0) {
      return raw;
    }

    const caseIds = [...new Set(raw.invoices.map((i) => i.caseId).filter(Boolean))];
    const caseResults = await Promise.allSettled(
      caseIds.map((caseId) => this.casesService.getCase(user, caseId)),
    );

    const caseById = new Map<string, CaseResponse>();
    const customerIds: string[] = [];
    caseResults.forEach((result, index) => {
      if (result.status !== "fulfilled") return;
      const caseData = result.value;
      caseById.set(caseIds[index]!, caseData);
      if (caseData.customerId) customerIds.push(caseData.customerId);
    });

    const customers = await this.customersService.listCustomersByIds(user, customerIds);
    const customerById = new Map(customers.map((c) => [c.id, c]));

    const invoices: OrganizationInvoiceSyncItem[] = raw.invoices.map((invoice) => {
      const caseData = caseById.get(invoice.caseId);
      const customer = caseData?.customerId ? customerById.get(caseData.customerId) : undefined;
      return {
        ...invoice,
        caseTitle: caseData?.title,
        customerDisplayName: customer?.displayName,
      };
    });

    return { invoices, total: raw.total };
  }

  async getOrganizationInvoiceSyncStats(
    user: AuthUser,
    filters?: { startDate?: string; endDate?: string; provider?: string },
  ): Promise<OrganizationInvoiceSyncStatsResponse> {
    const params: Record<string, string> = { organizationId: user.organizationId };
    if (filters?.startDate) params.startDate = filters.startDate;
    if (filters?.endDate) params.endDate = filters.endDate;
    if (filters?.provider) params.provider = filters.provider;
    return this.getJson<OrganizationInvoiceSyncStatsResponse>(
      "/integrations/invoice-syncs/stats",
      params,
    );
  }

  async getCaseInvoiceSync(user: AuthUser, caseId: string): Promise<CaseInvoiceSyncListResponse> {
    return this.getJson<CaseInvoiceSyncListResponse>(`/integrations/cases/${caseId}/invoice-sync`, {
      organizationId: user.organizationId,
    });
  }

  async finalizeCaseInvoice(
    user: AuthUser,
    caseId: string,
    syncId: string,
  ): Promise<CaseInvoiceSyncStatus> {
    const existing = await this.requireSync(user, caseId, syncId);
    assertAssignablePermission(
      user,
      existing.provider === "qonto" ? "integrations.qonto.sync" : "integrations.pennylane.sync",
    );
    const status = await this.postJson<CaseInvoiceSyncStatus>(
      `/integrations/cases/${caseId}/invoice-sync/${syncId}/finalize`,
      { organizationId: user.organizationId },
    );
    await this.recomputeCaseBillingStatus(user, caseId);
    return status;
  }

  async refreshCaseInvoiceSync(
    user: AuthUser,
    caseId: string,
    syncId: string,
  ): Promise<CaseInvoiceSyncStatus> {
    const existing = await this.requireSync(user, caseId, syncId);
    assertAssignablePermission(
      user,
      existing.provider === "qonto" ? "integrations.qonto.sync" : "integrations.pennylane.sync",
    );
    const status = await this.postJson<CaseInvoiceSyncStatus>(
      `/integrations/cases/${caseId}/invoice-sync/${syncId}/refresh`,
      { organizationId: user.organizationId },
    );
    await this.recomputeCaseBillingStatus(user, caseId);
    return status;
  }

  async refreshAllCaseInvoiceSyncs(
    user: AuthUser,
    caseId: string,
  ): Promise<CaseInvoiceSyncListResponse> {
    const list = await this.getCaseInvoiceSync(user, caseId);
    if (list.invoices.length === 0) {
      throw new BadRequestException(
        "Aucune facture d’intégration trouvée pour ce dossier. Envoyez d’abord le dossier vers Pennylane ou Qonto.",
      );
    }
    const providers = new Set(list.invoices.map((i) => i.provider));
    for (const provider of providers) {
      assertAssignablePermission(
        user,
        provider === "qonto" ? "integrations.qonto.sync" : "integrations.pennylane.sync",
      );
    }
    const refreshed = await this.postJson<CaseInvoiceSyncListResponse>(
      `/integrations/cases/${caseId}/invoice-sync/refresh`,
      { organizationId: user.organizationId },
    );
    await this.recomputeCaseBillingStatus(user, caseId);
    return refreshed;
  }

  async deleteCaseInvoiceSync(
    user: AuthUser,
    caseId: string,
    syncId: string,
  ): Promise<CaseInvoiceSyncListResponse> {
    const existing = await this.requireSync(user, caseId, syncId);
    assertAssignablePermission(
      user,
      existing.provider === "qonto" ? "integrations.qonto.sync" : "integrations.pennylane.sync",
    );
    try {
      const res = await firstValueFrom(
        this.httpService.delete<CaseInvoiceSyncListResponse>(
          `${INTEGRATIONS_URL}/integrations/cases/${caseId}/invoice-sync/${syncId}`,
          { params: { organizationId: user.organizationId } },
        ),
      );
      await this.recomputeCaseBillingStatus(user, caseId);
      return res.data;
    } catch (err) {
      this.rethrow(err);
    }
  }

  private async requireSync(
    user: AuthUser,
    caseId: string,
    syncId: string,
  ): Promise<CaseInvoiceSyncStatus> {
    const list = await this.getCaseInvoiceSync(user, caseId);
    const existing = list.invoices.find((i) => i.id === syncId);
    if (!existing) {
      throw new BadRequestException(
        "Facture d’intégration introuvable pour ce dossier. Actualisez la liste puis réessayez.",
      );
    }
    return existing;
  }

  private async prepareInvoiceSync(
    user: AuthUser,
    caseId: string,
    options: SyncCaseInvoiceOptions,
    providerLabel: string,
  ): Promise<{
    caseData: CaseResponse;
    customer: CustomerResponse;
    lines: Array<{
      label: string;
      quantity: number;
      unitPriceHt: string;
      tvaRate: TvaRate;
      unit?: string;
    }>;
    externalReference: string;
    quoteId: string;
    invoiceKind: CaseInvoiceKind;
    situationNumber?: number;
    situationPercent?: number;
    amountHt: string;
    quoteTotalHt: number;
  }> {
    const caseData = await this.casesService.getCase(user, caseId);
    if (!canCreateCaseInvoice(caseData.billingStatus)) {
      throw new BadRequestException(
        "Le dossier doit être « À facturer », « Brouillon facture » ou « Partiellement facturé » pour créer une facture.",
      );
    }

    if (!caseData.customerId) {
      throw new BadRequestException(
        `Le dossier n’a pas de client. Assignez un client avant l’envoi vers ${providerLabel}.`,
      );
    }

    const customer = await this.customersService.getCustomer(user, caseData.customerId);
    const invoiceKind: CaseInvoiceKind = options.invoiceKind ?? "full";
    const existing = await this.getCaseInvoiceSync(user, caseId);
    const quote = await this.requireQuoteForInvoice(user, caseData, options.quoteId);

    const quoteLines = quote.lines.map((line) => ({
      label: line.description || caseData.title,
      quantity: line.quantity,
      unitPriceHt: line.unitPrice.toFixed(2),
      tvaRate: line.tvaRate,
      unit: line.unit,
    }));

    if (quoteLines.length === 0) {
      throw new BadRequestException(
        "Le devis sélectionné n’a aucune ligne. Complétez le devis avant de créer une facture.",
      );
    }

    const quoteTotalHt = quote.totalHt;
    const quoteId = quote.id;
    const alreadyInvoicedHt = sumInvoiceAmountsHt(
      existing.invoices.filter(
        (i) =>
          i.quoteId === quoteId &&
          (i.remoteStatus === "finalized" ||
            i.remoteStatus === "paid" ||
            i.remoteStatus === "draft"),
      ),
    );

    const situationNumber =
      invoiceKind === "situation" ? nextSituationNumber(existing.invoices, quoteId) : undefined;

    let built: ReturnType<typeof buildInvoiceLinesFromQuote>;
    try {
      built = buildInvoiceLinesFromQuote({
        caseTitle: caseData.title,
        quoteSubject: quote.subject || quote.quoteNumber,
        quoteTotalHt,
        quoteLines,
        invoiceKind,
        situationPercent: options.situationPercent,
        amountHt: options.amountHt,
        alreadyInvoicedHt,
        situationNumber,
      });
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : "Facture invalide.");
    }

    const suffix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    return {
      caseData,
      customer,
      lines: built.lines,
      externalReference: `planwise-case-${caseData.id}-${suffix}`,
      quoteId,
      invoiceKind,
      situationNumber,
      situationPercent: built.situationPercent,
      amountHt: built.amountHt,
      quoteTotalHt,
    };
  }

  private async requireQuoteForInvoice(
    user: AuthUser,
    caseData: CaseResponse,
    quoteId?: string,
  ): Promise<QuoteResponse> {
    if (quoteId?.trim()) {
      const quote = await this.casesService.getQuote(user, quoteId.trim());
      if (quote.caseId !== caseData.id) {
        throw new BadRequestException("Le devis ne correspond pas à ce dossier.");
      }
      return quote;
    }

    const quotes = await this.casesService.listQuotes(user, { caseId: caseData.id });
    if (quotes.length === 0) {
      throw new BadRequestException(
        "Un devis est obligatoire pour créer une facture. Créez un devis sur ce dossier, puis réessayez.",
      );
    }
    const accepted = quotes.find((q) => q.status === "accepted");
    const preferred = accepted ?? quotes[0]!;
    return this.casesService.getQuote(user, preferred.id);
  }

  private async recomputeCaseBillingStatus(
    user: AuthUser,
    caseId: string,
    quoteTotalHtHint?: number,
  ): Promise<void> {
    const caseData = await this.casesService.getCase(user, caseId);
    const list = await this.getCaseInvoiceSync(user, caseId);
    let quoteTotalHt = quoteTotalHtHint ?? 0;
    if (quoteTotalHtHint == null) {
      const quotes = await this.casesService.listQuotes(user, { caseId });
      const accepted = quotes.filter((q) => q.status === "accepted");
      const pool = accepted.length > 0 ? accepted : quotes;
      quoteTotalHt = pool.reduce((s, q) => s + (q.totalHt ?? 0), 0);
    }
    const next = aggregateCaseBillingStatus(list.invoices, quoteTotalHt);
    if (!next || next === caseData.billingStatus) return;

    const mayApply =
      shouldUpgradeBillingStatus(caseData.billingStatus, next) ||
      caseData.billingStatus === "to_invoice" ||
      (caseData.billingStatus === "invoice_draft" && next === "partially_invoiced");
    if (!mayApply) return;

    await this.casesService.updateCase(user, caseId, { billingStatus: next as BillingStatus });
  }

  private async getJson<T>(path: string, params: Record<string, string>): Promise<T> {
    try {
      const res = await firstValueFrom(
        this.httpService.get<T>(`${INTEGRATIONS_URL}${path}`, { params }),
      );
      return res.data;
    } catch (err) {
      this.rethrow(err);
    }
  }

  private async postJson<T>(path: string, body: unknown): Promise<T> {
    try {
      const res = await firstValueFrom(
        this.httpService.post<T>(`${INTEGRATIONS_URL}${path}`, body),
      );
      return res.data;
    } catch (err) {
      this.rethrow(err);
    }
  }

  private rethrow(err: unknown): never {
    if (axios.isAxiosError(err)) {
      if (!err.response) {
        throw new ServiceUnavailableException(
          "Service d’intégrations indisponible. Réessayez dans un instant.",
        );
      }
      const status = err.response.status;
      const data = err.response.data as { message?: string | string[] } | undefined;
      const raw = data?.message;
      const message = Array.isArray(raw) ? raw.join(", ") : (raw ?? "Erreur d’intégration");
      if (status === 400) throw new BadRequestException(message);
      if (status === 404) throw new BadRequestException(message);
      throw new ServiceUnavailableException(message);
    }
    throw err;
  }
}
