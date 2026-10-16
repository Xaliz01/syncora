import type {
  AuthUser,
  CreditLocalInvoiceBody,
  LocalInvoiceResponse,
  LocalInvoiceStatsResponse,
  LocalInvoicesListResponse,
  SendLocalInvoiceEmailBody,
  SyncCaseInvoiceOptions,
} from "@planwise/shared";

export abstract class AbstractBillingGatewayService {
  abstract listInvoices(
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
  ): Promise<LocalInvoicesListResponse>;

  abstract getInvoice(user: AuthUser, invoiceId: string): Promise<LocalInvoiceResponse>;

  abstract getStats(
    user: AuthUser,
    filters?: { startDate?: string; endDate?: string },
  ): Promise<LocalInvoiceStatsResponse>;

  abstract createInvoice(
    user: AuthUser,
    caseId: string,
    options: SyncCaseInvoiceOptions,
  ): Promise<LocalInvoiceResponse>;

  abstract finalizeInvoice(user: AuthUser, invoiceId: string): Promise<LocalInvoiceResponse>;

  abstract markPaid(user: AuthUser, invoiceId: string): Promise<LocalInvoiceResponse>;

  abstract cancelInvoice(user: AuthUser, invoiceId: string): Promise<LocalInvoiceResponse>;

  abstract creditInvoice(
    user: AuthUser,
    invoiceId: string,
    body?: CreditLocalInvoiceBody,
  ): Promise<LocalInvoiceResponse>;

  abstract getInvoicePdf(user: AuthUser, invoiceId: string): Promise<Buffer>;

  abstract previewInvoice(
    user: AuthUser,
    caseId: string,
    options: SyncCaseInvoiceOptions,
  ): Promise<Buffer>;

  abstract sendInvoice(
    user: AuthUser,
    invoiceId: string,
    body: Pick<SendLocalInvoiceEmailBody, "to" | "cc" | "subject" | "body">,
  ): Promise<LocalInvoiceResponse>;
}
