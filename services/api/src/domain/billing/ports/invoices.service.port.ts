import type {
  CreateLocalInvoiceBody,
  CreditLocalInvoiceBody,
  LocalInvoiceResponse,
  LocalInvoiceStatsResponse,
  LocalInvoicesListResponse,
  SendLocalInvoiceEmailBody,
} from "@planwise/shared";

export abstract class AbstractInvoicesService {
  abstract createInvoice(body: CreateLocalInvoiceBody): Promise<LocalInvoiceResponse>;
  abstract listInvoices(
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
  ): Promise<LocalInvoicesListResponse>;
  abstract getInvoice(id: string, organizationId: string): Promise<LocalInvoiceResponse>;
  abstract finalizeInvoice(id: string, organizationId: string): Promise<LocalInvoiceResponse>;
  abstract markPaid(id: string, organizationId: string): Promise<LocalInvoiceResponse>;
  abstract cancelInvoice(id: string, organizationId: string): Promise<LocalInvoiceResponse>;
  abstract creditInvoice(id: string, body: CreditLocalInvoiceBody): Promise<LocalInvoiceResponse>;
  abstract getInvoicePdf(id: string, organizationId: string): Promise<Buffer>;
  abstract renderInvoicePdf(
    organizationId: string,
    body: { invoice: LocalInvoiceResponse; logoBase64?: string },
  ): Promise<Buffer>;
  abstract getStats(
    organizationId: string,
    filters?: { startDate?: string; endDate?: string },
  ): Promise<LocalInvoiceStatsResponse>;
  abstract sendInvoice(id: string, body: SendLocalInvoiceEmailBody): Promise<LocalInvoiceResponse>;
}
