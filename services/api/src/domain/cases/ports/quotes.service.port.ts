import type {
  CreateQuoteBody,
  QuoteEmailSendEntry,
  QuoteResponse,
  QuoteSummaryResponse,
  UpdateQuoteBody,
} from "@planwise/shared";

export abstract class AbstractQuotesService {
  abstract createQuote(body: CreateQuoteBody): Promise<QuoteResponse>;
  abstract listQuotes(
    organizationId: string,
    filters?: { caseId?: string; status?: string },
  ): Promise<QuoteSummaryResponse[]>;
  abstract getQuote(id: string, organizationId: string): Promise<QuoteResponse>;
  abstract updateQuote(id: string, body: UpdateQuoteBody): Promise<QuoteResponse>;
  abstract appendQuoteEmailSend(
    id: string,
    organizationId: string,
    entry: QuoteEmailSendEntry,
    options?: { markSent?: boolean },
  ): Promise<QuoteResponse>;
  abstract deleteQuote(id: string, organizationId: string): Promise<{ deleted: true }>;
}
