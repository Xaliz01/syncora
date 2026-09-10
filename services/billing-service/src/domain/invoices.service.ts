import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { Model } from "mongoose";
import {
  LOCAL_INVOICE_KINDS,
  LOCAL_INVOICE_STATUSES,
  INVOICE_EMAIL_COMMERCIAL_FOOTER,
  activeDocumentFilter,
  clampPagination,
  invoiceTotalsFromLines,
  buildCreditNoteLines,
  defaultInvoiceEmailBody,
  defaultInvoiceEmailSubject,
  invoiceEmailFailureMessage,
  isIssuedInvoiceStatus,
  isValidEmailAddress,
  type CreateLocalInvoiceBody,
  type CreditLocalInvoiceBody,
  type InvoiceEmailSendEntry,
  type LocalInvoiceKind,
  type LocalInvoiceResponse,
  type LocalInvoiceStatsResponse,
  type LocalInvoiceStatus,
  type LocalInvoicesListResponse,
  type SendEmailNotificationResponse,
  type SendLocalInvoiceEmailBody,
  type SendTransactionalEmailBody,
} from "@planwise/shared";
import {
  assertOrganizationScopedListNest,
  assertOrganizationScopedResourceNest,
  parseOrganizationIdBody,
  parseOrganizationIdQuery,
} from "@planwise/shared/nest";
import type { InvoiceDocument } from "../persistence/invoice.schema";
import type { InvoiceSequenceDocument } from "../persistence/invoice-sequence.schema";
import { AbstractInvoicesService } from "./ports/invoices.service.port";
import { toInvoiceResponse } from "./mappers/invoice.mapper";
import { renderInvoicePdf } from "./invoice-pdf";
import { buildInvoiceSearchOr } from "./utils";
import { SERVICE_URLS } from "../infrastructure/service-urls.config";

function isKind(value: string | undefined): value is LocalInvoiceKind {
  return LOCAL_INVOICE_KINDS.includes(value as LocalInvoiceKind);
}

function isStatus(value: string | undefined): value is LocalInvoiceStatus {
  return LOCAL_INVOICE_STATUSES.includes(value as LocalInvoiceStatus);
}

@Injectable()
export class InvoicesService extends AbstractInvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectModel("Invoice")
    private readonly invoiceModel: Model<InvoiceDocument>,
    @InjectModel("InvoiceSequence")
    private readonly sequenceModel: Model<InvoiceSequenceDocument>,
    private readonly httpService: HttpService,
  ) {
    super();
  }

  async createInvoice(body: CreateLocalInvoiceBody): Promise<LocalInvoiceResponse> {
    const organizationId = parseOrganizationIdBody(body.organizationId);
    const caseId = body.caseId?.trim();
    if (!caseId) throw new BadRequestException("Le dossier est requis.");
    if (!isKind(body.kind)) throw new BadRequestException("Type de facture invalide.");
    if (!body.customer?.partyId || !body.customer?.displayName) {
      throw new BadRequestException("Le destinataire de la facture est requis.");
    }
    if (!body.lines?.length) throw new BadRequestException("Au moins une ligne est requise.");

    if (body.kind === "credit_note") {
      if (!body.creditedInvoiceId?.trim()) {
        throw new BadRequestException("Un avoir doit référencer la facture d’origine.");
      }
      const original = await this.requireInvoice(body.creditedInvoiceId.trim(), organizationId);
      if (original.status !== "finalized" && original.status !== "paid") {
        throw new BadRequestException("Seule une facture finalisée peut être avoirisée.");
      }
    }

    if (body.kind === "situation" && (body.situationNumber == null || body.situationNumber < 1)) {
      throw new BadRequestException("Le numéro de situation est requis.");
    }

    const totals = invoiceTotalsFromLines(body.lines);
    const amountHt = body.amountHt?.trim() || totals.amountHt;
    const invoiceDate = body.invoiceDate ? new Date(body.invoiceDate) : new Date();
    const asDraft = body.draft !== false;
    const draftNumber = asDraft ? `BROUILLON-${Date.now().toString(36).toUpperCase()}` : undefined;

    const doc = await this.invoiceModel.create({
      organizationId,
      caseId,
      quoteId: body.quoteId?.trim() || undefined,
      kind: body.kind,
      status: asDraft ? "draft" : "finalized",
      draftNumber,
      number: asDraft ? undefined : await this.allocateNumber(organizationId, body.kind),
      invoiceDate,
      situationNumber: body.situationNumber,
      situationPercent: body.situationPercent,
      amountHt,
      amountTtc: totals.amountTtc,
      lines: body.lines,
      customer: body.customer,
      seller: body.seller,
      creditedInvoiceId: body.creditedInvoiceId?.trim() || undefined,
      caseTitle: body.caseTitle?.trim() || undefined,
      finalizedAt: asDraft ? undefined : new Date(),
    });

    return toInvoiceResponse(assertOrganizationScopedResourceNest(organizationId, doc));
  }

  async listInvoices(
    organizationId: string,
    filters?: {
      caseId?: string;
      status?: string;
      kind?: string;
      startDate?: string;
      endDate?: string;
      customerId?: string;
      orderGiverId?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<LocalInvoicesListResponse> {
    const orgId = parseOrganizationIdQuery(organizationId);
    const { limit, offset } = clampPagination(filters);
    const query: Record<string, unknown> = { organizationId: orgId, ...activeDocumentFilter };
    if (filters?.caseId?.trim()) query.caseId = filters.caseId.trim();
    if (filters?.status && isStatus(filters.status)) query.status = filters.status;
    if (filters?.kind && isKind(filters.kind)) query.kind = filters.kind;
    if (filters?.customerId?.trim()) query["customer.partyId"] = filters.customerId.trim();
    if (filters?.orderGiverId?.trim()) {
      query["customer.partyId"] = filters.orderGiverId.trim();
      query["customer.partyType"] = "order_giver";
    }
    if (filters?.startDate || filters?.endDate) {
      const range: Record<string, Date> = {};
      if (filters.startDate) range.$gte = new Date(filters.startDate);
      if (filters.endDate) range.$lte = new Date(filters.endDate);
      query.invoiceDate = range;
    }
    const searchOr = buildInvoiceSearchOr(filters?.search ?? "");
    if (searchOr.length > 0) query.$or = searchOr;

    const [docs, total] = await Promise.all([
      this.invoiceModel.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).exec(),
      this.invoiceModel.countDocuments(query).exec(),
    ]);
    const invoices = assertOrganizationScopedListNest(orgId, docs).map(toInvoiceResponse);
    return { invoices, total };
  }

  async getInvoice(id: string, organizationId: string): Promise<LocalInvoiceResponse> {
    const orgId = parseOrganizationIdQuery(organizationId);
    const doc = await this.requireInvoice(id, orgId);
    return toInvoiceResponse(doc);
  }

  async finalizeInvoice(id: string, organizationId: string): Promise<LocalInvoiceResponse> {
    const orgId = parseOrganizationIdQuery(organizationId);
    const doc = await this.requireInvoice(id, orgId);
    if (doc.status !== "draft") {
      throw new BadRequestException("Seule une facture brouillon peut être finalisée.");
    }
    doc.status = "finalized";
    doc.number = await this.allocateNumber(orgId, doc.kind);
    doc.finalizedAt = new Date();
    await doc.save();
    return toInvoiceResponse(doc);
  }

  async markPaid(id: string, organizationId: string): Promise<LocalInvoiceResponse> {
    const orgId = parseOrganizationIdQuery(organizationId);
    const doc = await this.requireInvoice(id, orgId);
    if (doc.status !== "finalized" && doc.status !== "paid") {
      throw new BadRequestException("Seule une facture finalisée peut être marquée payée.");
    }
    doc.status = "paid";
    await doc.save();
    return toInvoiceResponse(doc);
  }

  async cancelInvoice(id: string, organizationId: string): Promise<LocalInvoiceResponse> {
    const orgId = parseOrganizationIdQuery(organizationId);
    const doc = await this.requireInvoice(id, orgId);
    if (doc.status === "paid") {
      throw new BadRequestException(
        "Une facture payée ne peut pas être annulée. Émettez un avoir.",
      );
    }
    if (doc.status === "finalized") {
      throw new BadRequestException(
        "Une facture finalisée ne peut pas être annulée. Émettez un avoir.",
      );
    }
    // Soft-delete drafts: leave the list, keep history, never touch fiscal sequences.
    doc.status = "cancelled";
    doc.deletedAt = new Date();
    await doc.save();
    return toInvoiceResponse(doc);
  }

  async creditInvoice(id: string, body: CreditLocalInvoiceBody): Promise<LocalInvoiceResponse> {
    const organizationId = parseOrganizationIdBody(body.organizationId);
    const original = await this.requireInvoice(id, organizationId);
    if (original.status !== "finalized" && original.status !== "paid") {
      throw new BadRequestException("Seule une facture finalisée peut être avoirisée.");
    }
    const built = buildCreditNoteLines({
      originalLines: original.lines,
      originalAmountHt: Math.abs(Number.parseFloat(original.amountHt || "0")),
      creditAmountHt: body.amountHt,
      originalNumber: original.number,
    });
    return this.createInvoice({
      organizationId,
      caseId: original.caseId,
      caseTitle: original.caseTitle,
      quoteId: original.quoteId,
      kind: "credit_note",
      lines: built.lines,
      amountHt: built.amountHt,
      creditedInvoiceId: original._id.toString(),
      customer: original.customer,
      seller: original.seller,
      draft: false,
    });
  }

  async getInvoicePdf(id: string, organizationId: string): Promise<Buffer> {
    const invoice = await this.getInvoice(id, organizationId);
    return renderInvoicePdf(invoice);
  }

  async renderInvoicePdf(
    organizationId: string,
    body: { invoice: LocalInvoiceResponse; logoBase64?: string },
  ): Promise<Buffer> {
    const orgId = parseOrganizationIdBody(organizationId);
    const invoice = body.invoice;
    if (!invoice?.customer?.displayName) {
      throw new BadRequestException("Le destinataire de la facture est requis.");
    }
    if (!invoice.lines?.length) {
      throw new BadRequestException("Au moins une ligne est requise.");
    }
    if (invoice.organizationId && invoice.organizationId !== orgId) {
      throw new BadRequestException("organisationId mismatch");
    }
    let logo: Buffer | null = null;
    if (body.logoBase64?.trim()) {
      try {
        logo = Buffer.from(body.logoBase64, "base64");
      } catch {
        logo = null;
      }
    }
    return renderInvoicePdf({ ...invoice, organizationId: orgId }, { logo });
  }

  async sendInvoice(id: string, body: SendLocalInvoiceEmailBody): Promise<LocalInvoiceResponse> {
    const organizationId = parseOrganizationIdBody(body.organizationId);
    const doc = await this.requireInvoice(id, organizationId);
    if (!isIssuedInvoiceStatus(doc.status)) {
      throw new BadRequestException(
        doc.status === "draft"
          ? "Validez la facture avant de l’envoyer."
          : "Cette facture ne peut pas être envoyée.",
      );
    }

    const to = body.to?.trim() ?? "";
    if (!isValidEmailAddress(to)) {
      throw new BadRequestException("Indiquez une adresse e-mail valide.");
    }
    const cc = (body.cc ?? []).map((value) => value.trim()).filter(Boolean);
    if (cc.some((value) => !isValidEmailAddress(value))) {
      throw new BadRequestException("Une adresse en copie n’est pas valide.");
    }
    const sentByUserId = body.sentByUserId?.trim();
    if (!sentByUserId) {
      throw new BadRequestException("L’émetteur de l’envoi est requis.");
    }

    const invoice = toInvoiceResponse(doc);
    const subject = body.subject?.trim() || defaultInvoiceEmailSubject(invoice);
    const message = body.body?.trim() || defaultInvoiceEmailBody(invoice);
    const pdf = await renderInvoicePdf(invoice);
    const filename = `${invoice.number ?? "facture"}.pdf`;
    const footer = invoice.seller?.name
      ? `${INVOICE_EMAIL_COMMERCIAL_FOOTER} Document de ${invoice.seller.name}.`
      : INVOICE_EMAIL_COMMERCIAL_FOOTER;

    let sent = false;
    let reason: string | undefined;
    try {
      const payload: SendTransactionalEmailBody = {
        to,
        subject,
        body: message,
        footer,
        cc: cc.length > 0 ? cc : undefined,
        attachments: [
          {
            filename,
            contentType: "application/pdf",
            contentBase64: pdf.toString("base64"),
          },
        ],
      };
      const response = await firstValueFrom(
        this.httpService.post<SendEmailNotificationResponse>(
          `${SERVICE_URLS.notifications}/email/transactional`,
          payload,
        ),
      );
      sent = response.data.sent === true;
      reason = response.data.reason;
    } catch {
      sent = false;
      reason = "send_failed";
    }

    const entry: InvoiceEmailSendEntry = {
      sentAt: new Date().toISOString(),
      to,
      cc: cc.length > 0 ? cc : undefined,
      sentByUserId,
      sentByName: body.sentByName?.trim() || undefined,
      status: sent ? "sent" : "failed",
      reason: sent ? undefined : reason,
    };
    doc.emailSends = [...(doc.emailSends ?? []), entry];
    await doc.save();

    if (!sent) {
      this.logger.warn(`Invoice email not sent (${id}): ${reason ?? "send_failed"}`);
      throw new BadRequestException(invoiceEmailFailureMessage(reason));
    }
    return toInvoiceResponse(doc);
  }

  async getStats(
    organizationId: string,
    filters?: { startDate?: string; endDate?: string },
  ): Promise<LocalInvoiceStatsResponse> {
    const list = await this.listInvoices(organizationId, {
      ...filters,
      limit: 200,
      offset: 0,
    });
    const invoices = list.invoices;
    const byKind: LocalInvoiceStatsResponse["byKind"] = {};
    let amountHtDraft = 0;
    let amountHtFinalized = 0;
    let amountHtPaid = 0;
    for (const inv of invoices) {
      byKind[inv.kind] = (byKind[inv.kind] ?? 0) + 1;
      const ht = Number.parseFloat(inv.amountHt || "0");
      if (inv.status === "draft") amountHtDraft += ht;
      if (inv.status === "finalized") amountHtFinalized += ht;
      if (inv.status === "paid") amountHtPaid += ht;
    }
    return {
      total: list.total,
      draftCount: invoices.filter((i) => i.status === "draft").length,
      finalizedCount: invoices.filter((i) => i.status === "finalized").length,
      paidCount: invoices.filter((i) => i.status === "paid").length,
      cancelledCount: invoices.filter((i) => i.status === "cancelled").length,
      amountHtDraft: amountHtDraft.toFixed(2),
      amountHtFinalized: amountHtFinalized.toFixed(2),
      amountHtPaid: amountHtPaid.toFixed(2),
      amountHtTotal: (amountHtDraft + amountHtFinalized + amountHtPaid).toFixed(2),
      byKind,
    };
  }

  private async requireInvoice(id: string, organizationId: string): Promise<InvoiceDocument> {
    const doc = await this.invoiceModel.findOne({ _id: id, ...activeDocumentFilter }).exec();
    return assertOrganizationScopedResourceNest(organizationId, doc, "Facture introuvable");
  }

  private async allocateNumber(organizationId: string, kind: LocalInvoiceKind): Promise<string> {
    const series = kind === "credit_note" ? "A" : "F";
    const year = new Date().getUTCFullYear();
    const seq = await this.sequenceModel.findOneAndUpdate(
      { organizationId, series, year },
      { $inc: { lastNumber: 1 } },
      { upsert: true, new: true },
    );
    const last = seq?.lastNumber ?? 1;
    return `${series}-${year}-${String(last).padStart(5, "0")}`;
  }
}
