import type {
  CreditLocalInvoiceBody,
  LocalInvoiceResponse,
  LocalInvoiceStatsResponse,
  LocalInvoicesListResponse,
  SendLocalInvoiceEmailBody,
  SyncCaseInvoiceOptions,
} from "@planwise/shared";
import { apiRequestJson } from "./api-client";
import { API_BASE, getAccessToken } from "./api-client";

export function listInvoices(filters?: {
  caseId?: string;
  status?: string;
  kind?: string;
  startDate?: string;
  endDate?: string;
  customerId?: string;
  orderGiverId?: string;
  limit?: number;
  offset?: number;
}): Promise<LocalInvoicesListResponse> {
  const params = new URLSearchParams();
  if (filters?.caseId) params.set("caseId", filters.caseId);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.kind) params.set("kind", filters.kind);
  if (filters?.startDate) params.set("startDate", filters.startDate);
  if (filters?.endDate) params.set("endDate", filters.endDate);
  if (filters?.customerId) params.set("customerId", filters.customerId);
  if (filters?.orderGiverId) params.set("orderGiverId", filters.orderGiverId);
  if (filters?.limit != null) params.set("limit", String(filters.limit));
  if (filters?.offset != null) params.set("offset", String(filters.offset));
  const qs = params.toString();
  return apiRequestJson<LocalInvoicesListResponse>("GET", `/billing/invoices${qs ? `?${qs}` : ""}`);
}

export function getInvoiceStats(filters?: {
  startDate?: string;
  endDate?: string;
}): Promise<LocalInvoiceStatsResponse> {
  const params = new URLSearchParams();
  if (filters?.startDate) params.set("startDate", filters.startDate);
  if (filters?.endDate) params.set("endDate", filters.endDate);
  const qs = params.toString();
  return apiRequestJson<LocalInvoiceStatsResponse>(
    "GET",
    `/billing/invoices/stats${qs ? `?${qs}` : ""}`,
  );
}

export function getInvoice(invoiceId: string): Promise<LocalInvoiceResponse> {
  return apiRequestJson<LocalInvoiceResponse>("GET", `/billing/invoices/${invoiceId}`);
}

export function createCaseInvoice(
  caseId: string,
  options: SyncCaseInvoiceOptions,
): Promise<LocalInvoiceResponse> {
  return apiRequestJson<LocalInvoiceResponse>("POST", `/billing/cases/${caseId}/invoices`, {
    body: options,
  });
}

export function finalizeInvoice(invoiceId: string): Promise<LocalInvoiceResponse> {
  return apiRequestJson<LocalInvoiceResponse>("POST", `/billing/invoices/${invoiceId}/finalize`);
}

export function markInvoicePaid(invoiceId: string): Promise<LocalInvoiceResponse> {
  return apiRequestJson<LocalInvoiceResponse>("POST", `/billing/invoices/${invoiceId}/paid`);
}

export function cancelInvoice(invoiceId: string): Promise<LocalInvoiceResponse> {
  return apiRequestJson<LocalInvoiceResponse>("POST", `/billing/invoices/${invoiceId}/cancel`);
}

export function creditInvoice(
  invoiceId: string,
  body?: Pick<CreditLocalInvoiceBody, "amountHt">,
): Promise<LocalInvoiceResponse> {
  return apiRequestJson<LocalInvoiceResponse>("POST", `/billing/invoices/${invoiceId}/credit`, {
    body: body ?? {},
  });
}

export function sendInvoice(
  invoiceId: string,
  body: Pick<SendLocalInvoiceEmailBody, "to" | "cc" | "subject" | "body">,
): Promise<LocalInvoiceResponse> {
  return apiRequestJson<LocalInvoiceResponse>("POST", `/billing/invoices/${invoiceId}/send`, {
    body,
  });
}

async function invoicePdfResponse(invoiceId: string): Promise<Response> {
  const token = getAccessToken();
  if (!token) throw new Error("Session expirée");
  const response = await fetch(`${API_BASE}/billing/invoices/${invoiceId}/pdf`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error("Impossible de télécharger le PDF de la facture");
  }
  return response;
}

export async function downloadInvoicePdf(invoiceId: string, filename?: string): Promise<void> {
  const response = await invoicePdfResponse(invoiceId);
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = filename ?? `facture-${invoiceId}.pdf`;
  anchor.click();
  URL.revokeObjectURL(blobUrl);
}

export async function previewInvoicePdf(invoiceId: string): Promise<string> {
  const response = await invoicePdfResponse(invoiceId);
  const blob = await response.blob();
  return URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
}

export async function previewCaseInvoicePdf(
  caseId: string,
  options: SyncCaseInvoiceOptions,
): Promise<string> {
  const token = getAccessToken();
  if (!token) throw new Error("Session expirée");
  const response = await fetch(`${API_BASE}/billing/cases/${caseId}/invoices/preview-pdf`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(options),
  });
  if (!response.ok) {
    throw new Error("Impossible de prévisualiser le PDF de la facture");
  }
  const blob = await response.blob();
  return URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
}
