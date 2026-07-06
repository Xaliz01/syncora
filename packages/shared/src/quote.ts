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
  description: string;
  quantity: number;
  unitPrice: number;
  tvaRate: TvaRate;
  unit?: string;
}

export interface QuoteLineResponse {
  id: string;
  articleId?: string;
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
  createdAt?: string;
  updatedAt?: string;
  isTestData?: boolean;
}
