import type { QuoteResponse, QuoteSummaryResponse } from "@planwise/shared";
import { apiRequestJson, type ApiMethod } from "./api-client";
import { API_BASE, getAccessToken } from "./api-client";

async function quotesRequest<TResponse>(
  method: ApiMethod,
  path: string,
  body?: unknown,
): Promise<TResponse> {
  return apiRequestJson<TResponse>(method, path, typeof body === "undefined" ? {} : { body });
}

export interface CreateQuotePayload {
  caseId: string;
  subject?: string;
  notes?: string;
  validUntil?: string;
  lines: {
    articleId?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    tvaRate: number;
    unit?: string;
  }[];
}

export interface UpdateQuotePayload {
  subject?: string;
  notes?: string;
  status?: string;
  validUntil?: string | null;
  lines?: {
    articleId?: string;
    description: string;
    quantity: number;
    unitPrice: number;
    tvaRate: number;
    unit?: string;
  }[];
}

export function listQuotes(filters?: { caseId?: string; status?: string }) {
  const params = new URLSearchParams();
  if (filters?.caseId) params.set("caseId", filters.caseId);
  if (filters?.status) params.set("status", filters.status);
  const qs = params.toString();
  return quotesRequest<QuoteSummaryResponse[]>("GET", `/cases/quotes${qs ? `?${qs}` : ""}`);
}

export function getQuote(quoteId: string) {
  return quotesRequest<QuoteResponse>("GET", `/cases/quotes/${quoteId}`);
}

export function createQuote(payload: CreateQuotePayload) {
  return quotesRequest<QuoteResponse>("POST", "/cases/quotes", payload);
}

export function updateQuote(quoteId: string, payload: UpdateQuotePayload) {
  return quotesRequest<QuoteResponse>("PATCH", `/cases/quotes/${quoteId}`, payload);
}

export function deleteQuote(quoteId: string) {
  return quotesRequest<{ deleted: true }>("DELETE", `/cases/quotes/${quoteId}`);
}

export async function downloadQuotePdf(quoteId: string, quoteNumber: string): Promise<void> {
  const token = getAccessToken();
  if (!token) throw new Error("Session expirée");

  const response = await fetch(`${API_BASE}/cases/quotes/${quoteId}/pdf`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error("Impossible de générer le PDF du devis");
  }

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = `devis-${quoteNumber}.pdf`;
  anchor.click();
  URL.revokeObjectURL(blobUrl);
}
