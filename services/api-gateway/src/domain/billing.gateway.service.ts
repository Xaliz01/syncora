import { BadRequestException, Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  AuthUser,
  BillingStatus,
  CaseResponse,
  CreateLocalInvoiceBody,
  CreditLocalInvoiceBody,
  CustomerResponse,
  InvoiceSellerSnapshot,
  LocalInvoiceKind,
  LocalInvoiceResponse,
  LocalInvoiceStatsResponse,
  LocalInvoicesListResponse,
  OrderGiverResponse,
  OrganizationResponse,
  QuoteResponse,
  SendLocalInvoiceEmailBody,
  SyncCaseInvoiceOptions,
  TvaRate,
} from "@planwise/shared";
import {
  billingStatusFromLocalInvoices,
  buildInvoiceLinesFromCustom,
  buildInvoiceLinesFromQuote,
  canCreateCaseInvoice,
  invoiceTotalsFromLines,
  nextSituationNumber,
  shouldUpgradeBillingStatus,
  sumInvoiceAmountsHt,
} from "@planwise/shared";
import { OrganizationScopedHttpClient } from "../infrastructure/organization-scoped-http.client";
import { AbstractBillingGatewayService } from "./ports/billing.service.port";
import { AbstractCasesGatewayService } from "./ports/cases.service.port";
import { AbstractCustomersGatewayService } from "./ports/customers.service.port";
import { AbstractOrderGiversGatewayService } from "./ports/order-givers.service.port";
import { AbstractOrganizationsGatewayService } from "./ports/organizations.service.port";
import { SERVICE_URLS } from "../infrastructure/service-urls.config";

type InvoiceBillingParty = Pick<
  CustomerResponse,
  "id" | "displayName" | "kind" | "firstName" | "lastName" | "email" | "legalIdentifier" | "address"
>;

function toInvoiceBillingParty(party: CustomerResponse | OrderGiverResponse): InvoiceBillingParty {
  return {
    id: party.id,
    displayName: party.displayName,
    kind: party.kind,
    firstName: party.firstName,
    lastName: party.lastName,
    email: party.email,
    legalIdentifier: party.legalIdentifier,
    address: party.address,
  };
}

@Injectable()
export class BillingGatewayService extends AbstractBillingGatewayService {
  constructor(
    private readonly scopedHttp: OrganizationScopedHttpClient,
    private readonly httpService: HttpService,
    private readonly casesService: AbstractCasesGatewayService,
    private readonly customersService: AbstractCustomersGatewayService,
    private readonly orderGiversService: AbstractOrderGiversGatewayService,
    private readonly organizationsService: AbstractOrganizationsGatewayService,
  ) {
    super();
  }

  async listInvoices(
    user: AuthUser,
    filters?: {
      caseId?: string;
      status?: string;
      kind?: string;
      startDate?: string;
      endDate?: string;
      customerId?: string;
      orderGiverId?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<LocalInvoicesListResponse> {
    return this.scopedHttp.request<LocalInvoicesListResponse>({
      baseUrl: SERVICE_URLS.billing,
      organizationId: user.organizationId,
      method: "get",
      path: "/invoices",
      query: filters,
      errorLabel: "Billing service error",
    });
  }

  async getInvoice(user: AuthUser, invoiceId: string): Promise<LocalInvoiceResponse> {
    return this.scopedHttp.request<LocalInvoiceResponse>({
      baseUrl: SERVICE_URLS.billing,
      organizationId: user.organizationId,
      method: "get",
      path: `/invoices/${invoiceId}`,
      errorLabel: "Billing service error",
    });
  }

  async getStats(
    user: AuthUser,
    filters?: { startDate?: string; endDate?: string },
  ): Promise<LocalInvoiceStatsResponse> {
    return this.scopedHttp.request<LocalInvoiceStatsResponse>({
      baseUrl: SERVICE_URLS.billing,
      organizationId: user.organizationId,
      method: "get",
      path: "/invoices/stats",
      query: filters,
      errorLabel: "Billing service error",
    });
  }

  async createInvoice(
    user: AuthUser,
    caseId: string,
    options: SyncCaseInvoiceOptions,
  ): Promise<LocalInvoiceResponse> {
    const prepared = await this.prepareInvoice(user, caseId, options);
    const org = await this.organizationsService.getMine(user);
    const invoice = await this.scopedHttp.request<LocalInvoiceResponse>({
      baseUrl: SERVICE_URLS.billing,
      organizationId: user.organizationId,
      method: "post",
      path: "/invoices",
      body: {
        caseId,
        caseTitle: prepared.caseData.title,
        quoteId: prepared.quoteId,
        kind: prepared.invoiceKind,
        lines: prepared.lines,
        amountHt: prepared.amountHt,
        situationNumber: prepared.situationNumber,
        situationPercent: prepared.situationPercent,
        customer: this.toCustomerSnapshot(prepared),
        seller: this.toSellerSnapshot(org),
        draft: options.draft !== false,
      } satisfies Omit<CreateLocalInvoiceBody, "organizationId">,
      errorLabel: "Billing service error",
    });
    await this.recomputeCaseBillingStatus(user, caseId, prepared.quoteTotalHt);
    return invoice;
  }

  async finalizeInvoice(user: AuthUser, invoiceId: string): Promise<LocalInvoiceResponse> {
    const invoice = await this.scopedHttp.request<LocalInvoiceResponse>({
      baseUrl: SERVICE_URLS.billing,
      organizationId: user.organizationId,
      method: "post",
      path: `/invoices/${invoiceId}/finalize`,
      body: {},
      errorLabel: "Billing service error",
    });
    await this.recomputeCaseBillingStatus(user, invoice.caseId);
    return invoice;
  }

  async markPaid(user: AuthUser, invoiceId: string): Promise<LocalInvoiceResponse> {
    const invoice = await this.scopedHttp.request<LocalInvoiceResponse>({
      baseUrl: SERVICE_URLS.billing,
      organizationId: user.organizationId,
      method: "post",
      path: `/invoices/${invoiceId}/paid`,
      body: {},
      errorLabel: "Billing service error",
    });
    await this.recomputeCaseBillingStatus(user, invoice.caseId);
    return invoice;
  }

  async cancelInvoice(user: AuthUser, invoiceId: string): Promise<LocalInvoiceResponse> {
    const invoice = await this.scopedHttp.request<LocalInvoiceResponse>({
      baseUrl: SERVICE_URLS.billing,
      organizationId: user.organizationId,
      method: "post",
      path: `/invoices/${invoiceId}/cancel`,
      body: {},
      errorLabel: "Billing service error",
    });
    await this.recomputeCaseBillingStatus(user, invoice.caseId);
    return invoice;
  }

  async creditInvoice(
    user: AuthUser,
    invoiceId: string,
    body?: CreditLocalInvoiceBody,
  ): Promise<LocalInvoiceResponse> {
    const invoice = await this.scopedHttp.request<LocalInvoiceResponse>({
      baseUrl: SERVICE_URLS.billing,
      organizationId: user.organizationId,
      method: "post",
      path: `/invoices/${invoiceId}/credit`,
      body: { amountHt: body?.amountHt },
      errorLabel: "Billing service error",
    });
    await this.recomputeCaseBillingStatus(user, invoice.caseId);
    return invoice;
  }

  async getInvoicePdf(user: AuthUser, invoiceId: string): Promise<Buffer> {
    const invoice = await this.getInvoice(user, invoiceId);
    return this.renderInvoicePdf(user, invoice);
  }

  async sendInvoice(
    user: AuthUser,
    invoiceId: string,
    body: Pick<SendLocalInvoiceEmailBody, "to" | "cc" | "subject" | "body">,
  ): Promise<LocalInvoiceResponse> {
    return this.scopedHttp.request<LocalInvoiceResponse>({
      baseUrl: SERVICE_URLS.billing,
      organizationId: user.organizationId,
      method: "post",
      path: `/invoices/${invoiceId}/send`,
      body: {
        to: body.to,
        cc: body.cc,
        subject: body.subject,
        body: body.body,
        sentByUserId: user.id,
        sentByName: user.name,
      },
      errorLabel: "Billing service error",
    });
  }

  async previewInvoice(
    user: AuthUser,
    caseId: string,
    options: SyncCaseInvoiceOptions,
  ): Promise<Buffer> {
    const prepared = await this.prepareInvoice(user, caseId, options);
    const org = await this.organizationsService.getMine(user);
    const totals = invoiceTotalsFromLines(prepared.lines);
    const invoice: LocalInvoiceResponse = {
      id: "preview",
      organizationId: user.organizationId,
      caseId,
      quoteId: prepared.quoteId,
      kind: prepared.invoiceKind,
      status: "draft",
      draftNumber: "BROUILLON",
      invoiceDate: new Date().toISOString(),
      situationNumber: prepared.situationNumber,
      situationPercent: prepared.situationPercent,
      amountHt: prepared.amountHt,
      amountTtc: totals.amountTtc,
      lines: prepared.lines,
      customer: this.toCustomerSnapshot(prepared),
      seller: this.toSellerSnapshot(org),
      caseTitle: prepared.caseData.title,
    };
    return this.renderInvoicePdf(user, invoice);
  }

  private toCustomerSnapshot(prepared: {
    caseData: CaseResponse;
    customer: InvoiceBillingParty;
  }): LocalInvoiceResponse["customer"] {
    return {
      partyId: prepared.customer.id,
      partyType: prepared.caseData.orderGiverId ? "order_giver" : "customer",
      displayName: prepared.customer.displayName,
      email: prepared.customer.email,
      legalIdentifier: prepared.customer.legalIdentifier,
      addressLine1: prepared.customer.address?.line1,
      addressLine2: prepared.customer.address?.line2,
      postalCode: prepared.customer.address?.postalCode,
      city: prepared.customer.address?.city,
      country: prepared.customer.address?.country,
    };
  }

  private toSellerSnapshot(org?: OrganizationResponse | null): InvoiceSellerSnapshot | undefined {
    if (!org) return undefined;
    return {
      name: org.name,
      siret: org.siret,
      email: org.email,
      addressLine1: org.addressLine1,
      addressLine2: org.addressLine2,
      postalCode: org.postalCode,
      city: org.city,
      country: org.country,
    };
  }

  private async renderInvoicePdf(user: AuthUser, invoice: LocalInvoiceResponse): Promise<Buffer> {
    const org = await this.organizationsService.getMine(user);
    const logo = org?.logoDocumentId
      ? await this.fetchDocumentImageBuffer(user.organizationId, org.logoDocumentId)
      : null;
    const data = await this.scopedHttp.request<ArrayBuffer>({
      baseUrl: SERVICE_URLS.billing,
      organizationId: user.organizationId,
      method: "post",
      path: "/invoices/render-pdf",
      body: {
        invoice,
        logoBase64: logo ? logo.toString("base64") : undefined,
      },
      validateResponseScope: false,
      axiosConfig: { responseType: "arraybuffer" },
      errorLabel: "Billing service error",
    });
    return Buffer.from(data);
  }

  private async fetchDocumentImageBuffer(
    organizationId: string,
    documentId: string,
  ): Promise<Buffer | null> {
    try {
      const urlRes = await firstValueFrom(
        this.httpService.get<{ url: string }>(
          `${SERVICE_URLS.documents}/documents/${documentId}/download-url`,
          { params: { organizationId } },
        ),
      );
      let downloadUrl = urlRes.data.url;
      if (downloadUrl.startsWith("/documents/download/")) {
        downloadUrl = `${SERVICE_URLS.documents}${downloadUrl}`;
      }
      const fileRes = await firstValueFrom(
        this.httpService.get(downloadUrl, { responseType: "arraybuffer", timeout: 15000 }),
      );
      return Buffer.from(fileRes.data);
    } catch {
      return null;
    }
  }

  private async prepareInvoice(
    user: AuthUser,
    caseId: string,
    options: SyncCaseInvoiceOptions,
  ): Promise<{
    caseData: CaseResponse;
    customer: InvoiceBillingParty;
    lines: Array<{
      label: string;
      quantity: number;
      unitPriceHt: string;
      tvaRate: TvaRate;
      unit?: string;
    }>;
    quoteId?: string;
    invoiceKind: LocalInvoiceKind;
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
    if (!caseData.customerId && !caseData.orderGiverId) {
      throw new BadRequestException(
        "Le dossier n’a pas de client ni de donneur d’ordre. Assignez un destinataire avant de facturer.",
      );
    }
    const customer = caseData.orderGiverId
      ? toInvoiceBillingParty(
          await this.orderGiversService.getOrderGiver(user, caseData.orderGiverId),
        )
      : toInvoiceBillingParty(await this.customersService.getCustomer(user, caseData.customerId!));

    const customLines = options.lines?.filter((l) => l.label?.trim()) ?? [];
    const hasCustomLines = customLines.length > 0;
    const quoteIdOpt = options.quoteId?.trim();

    if (hasCustomLines) {
      let built: ReturnType<typeof buildInvoiceLinesFromCustom>;
      try {
        built = buildInvoiceLinesFromCustom({ lines: customLines });
      } catch (err) {
        throw new BadRequestException(err instanceof Error ? err.message : "Facture invalide.");
      }
      return {
        caseData,
        customer,
        lines: built.lines,
        invoiceKind: "full",
        amountHt: built.amountHt,
        quoteTotalHt: 0,
      };
    }

    const invoiceKind: LocalInvoiceKind = options.invoiceKind ?? "full";
    const existing = await this.listInvoices(user, { caseId, limit: 200, offset: 0 });
    const quote = await this.requireQuoteForInvoice(user, caseData, quoteIdOpt);
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
    const alreadyInvoicedHt = sumInvoiceAmountsHt(
      existing.invoices
        .filter((i) => i.quoteId === quote.id && i.status !== "cancelled")
        .map((i) => ({
          amountHt: i.amountHt,
          remoteStatus: i.status,
        })),
    );
    const situationNumber =
      invoiceKind === "situation"
        ? nextSituationNumber(
            existing.invoices.map((i) => ({
              quoteId: i.quoteId,
              invoiceKind: i.kind === "credit_note" ? undefined : i.kind,
              situationNumber: i.situationNumber,
              remoteStatus: i.status,
            })),
            quote.id,
          )
        : undefined;
    let built: ReturnType<typeof buildInvoiceLinesFromQuote>;
    try {
      built = buildInvoiceLinesFromQuote({
        caseTitle: caseData.title,
        quoteSubject: quote.subject || quote.quoteNumber,
        quoteTotalHt: quote.totalHt,
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
    return {
      caseData,
      customer,
      lines: built.lines,
      quoteId: quote.id,
      invoiceKind,
      situationNumber,
      situationPercent: built.situationPercent,
      amountHt: built.amountHt,
      quoteTotalHt: quote.totalHt,
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
      if (quote.status !== "accepted") {
        throw new BadRequestException(
          "Seul un devis accepté peut être facturé. Acceptez le devis, puis réessayez.",
        );
      }
      return quote;
    }
    const quotes = await this.casesService.listQuotes(user, { caseId: caseData.id });
    const accepted = quotes.find((q) => q.status === "accepted");
    if (!accepted) {
      throw new BadRequestException(
        "Un devis accepté est obligatoire pour créer une facture. Acceptez un devis sur ce dossier, puis réessayez.",
      );
    }
    return this.casesService.getQuote(user, accepted.id);
  }

  private async recomputeCaseBillingStatus(
    user: AuthUser,
    caseId: string,
    quoteTotalHtHint?: number,
  ): Promise<void> {
    const caseData = await this.casesService.getCase(user, caseId);
    const list = await this.listInvoices(user, { caseId, limit: 200, offset: 0 });
    let quoteTotalHt = quoteTotalHtHint ?? 0;
    if (quoteTotalHtHint == null) {
      const quotes = await this.casesService.listQuotes(user, { caseId });
      const accepted = quotes.filter((q) => q.status === "accepted");
      const pool = accepted.length > 0 ? accepted : quotes;
      quoteTotalHt = pool.reduce((s, q) => s + (q.totalHt ?? 0), 0);
    }
    const next = billingStatusFromLocalInvoices(list.invoices, quoteTotalHt);
    if (!next || next === caseData.billingStatus) return;
    const mayApply =
      shouldUpgradeBillingStatus(caseData.billingStatus, next) ||
      caseData.billingStatus === "to_invoice" ||
      (caseData.billingStatus === "invoice_draft" && next === "partially_invoiced");
    if (!mayApply) return;
    await this.casesService.updateCase(user, caseId, { billingStatus: next as BillingStatus });
  }
}
