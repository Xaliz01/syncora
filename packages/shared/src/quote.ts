/** API contracts for quotes (devis) — Phase 3.1 */

export const QUOTE_STATUSES = ["draft", "sent", "accepted", "rejected", "cancelled"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  rejected: "Refusé",
  cancelled: "Annulé",
};

export const TVA_RATES = [0, 5.5, 10, 20] as const;
export type TvaRate = (typeof TVA_RATES)[number];

export interface QuoteLineBody {
  articleId?: string;
  prestationId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tvaRate: TvaRate;
  unit?: string;
}

export interface QuoteLineResponse {
  id: string;
  articleId?: string;
  prestationId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tvaRate: TvaRate;
  unit?: string;
  totalHt: number;
  totalTtc: number;
}

export interface CreateQuoteBody {
  organizationId: string;
  caseId: string;
  subject?: string;
  notes?: string;
  validUntil?: string;
  lines: QuoteLineBody[];
  isTestData?: boolean;
}

export interface UpdateQuoteBody {
  organizationId: string;
  subject?: string;
  notes?: string;
  status?: QuoteStatus;
  validUntil?: string | null;
  lines?: QuoteLineBody[];
}

export const QUOTE_EMAIL_SEND_STATUSES = ["sent", "failed"] as const;
export type QuoteEmailSendStatus = (typeof QUOTE_EMAIL_SEND_STATUSES)[number];

export interface QuoteEmailSendEntry {
  sentAt: string;
  to: string;
  cc?: string[];
  sentByUserId: string;
  sentByName?: string;
  status: QuoteEmailSendStatus;
  reason?: string;
}

export interface SendQuoteEmailBody {
  organizationId: string;
  to: string;
  cc?: string[];
  subject?: string;
  body?: string;
  sentByUserId: string;
  sentByName?: string;
}

export function canSendQuoteByEmail(status: QuoteStatus): boolean {
  return status === "draft" || status === "sent" || status === "accepted";
}

export function defaultQuoteEmailSubject(quote: Pick<QuoteResponse, "quoteNumber">): string {
  return `Devis ${quote.quoteNumber}`;
}

export function defaultQuoteEmailBody(
  quote: Pick<QuoteResponse, "quoteNumber" | "totalHt">,
  organizationName?: string,
): string {
  const who = organizationName?.trim();
  const closing = who ? `\n\nCordialement\n${who}` : "\n\nCordialement";
  return `Bonjour,\n\nVeuillez trouver ci-joint le devis ${quote.quoteNumber} d’un montant de ${quote.totalHt} € HT.${closing}`;
}

export interface QuoteResponse {
  id: string;
  organizationId: string;
  caseId: string;
  caseTitle?: string;
  quoteNumber: string;
  subject?: string;
  notes?: string;
  status: QuoteStatus;
  validUntil?: string;
  lines: QuoteLineResponse[];
  totalHt: number;
  totalTva: number;
  totalTtc: number;
  emailSends?: QuoteEmailSendEntry[];
  createdAt?: string;
  updatedAt?: string;
  isTestData?: boolean;
}

export interface QuoteSummaryResponse {
  id: string;
  organizationId: string;
  caseId: string;
  caseTitle?: string;
  quoteNumber: string;
  subject?: string;
  status: QuoteStatus;
  totalHt: number;
  totalTtc: number;
  validUntil?: string;
  emailSends?: QuoteEmailSendEntry[];
  createdAt?: string;
  updatedAt?: string;
  isTestData?: boolean;
}
