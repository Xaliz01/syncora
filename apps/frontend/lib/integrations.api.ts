import type {
  BillingIntegrationAvailability,
  CaseInvoiceSyncListResponse,
  CaseInvoiceSyncStatus,
  OrganizationInvoiceSyncStatsResponse,
  OrganizationInvoiceSyncsListResponse,
  PennylaneConnectionStatus,
  PennylaneOAuthStartResponse,
  QontoConnectionStatus,
  QontoOAuthStartResponse,
  SyncCaseInvoiceOptions,
  SyncCaseToPennylaneResult,
  SyncCaseToQontoResult,
} from "@planwise/shared";
import { apiRequestJson } from "./api-client";

export function getPennylaneStatus(): Promise<PennylaneConnectionStatus> {
  return apiRequestJson<PennylaneConnectionStatus>("GET", "/integrations/pennylane");
}

export function getBillingIntegrationAvailability(): Promise<BillingIntegrationAvailability> {
  return apiRequestJson<BillingIntegrationAvailability>(
    "GET",
    "/integrations/billing-availability",
  );
}

export function startPennylaneOAuth(): Promise<PennylaneOAuthStartResponse> {
  return apiRequestJson<PennylaneOAuthStartResponse>("POST", "/integrations/pennylane/oauth/start");
}

export function completePennylaneOAuth(
  code: string,
  state: string,
): Promise<PennylaneConnectionStatus> {
  return apiRequestJson<PennylaneConnectionStatus>(
    "POST",
    "/integrations/pennylane/oauth/complete",
    { body: { code, state } },
  );
}

export function connectPennylane(apiToken: string): Promise<PennylaneConnectionStatus> {
  return apiRequestJson<PennylaneConnectionStatus>("POST", "/integrations/pennylane/connect", {
    body: { apiToken },
  });
}

export function disconnectPennylane(): Promise<PennylaneConnectionStatus> {
  return apiRequestJson<PennylaneConnectionStatus>("DELETE", "/integrations/pennylane");
}

export function syncCaseToPennylane(
  caseId: string,
  options: SyncCaseInvoiceOptions,
): Promise<SyncCaseToPennylaneResult> {
  const body: SyncCaseInvoiceOptions = {
    quoteId: options.quoteId,
  };
  if (options.invoiceKind) body.invoiceKind = options.invoiceKind;
  if (options.situationPercent != null) body.situationPercent = options.situationPercent;
  if (options.amountHt != null) body.amountHt = options.amountHt;
  return apiRequestJson<SyncCaseToPennylaneResult>(
    "POST",
    `/integrations/pennylane/cases/${caseId}/sync`,
    { body },
  );
}

export function getQontoStatus(): Promise<QontoConnectionStatus> {
  return apiRequestJson<QontoConnectionStatus>("GET", "/integrations/qonto");
}

export function startQontoOAuth(): Promise<QontoOAuthStartResponse> {
  return apiRequestJson<QontoOAuthStartResponse>("POST", "/integrations/qonto/oauth/start");
}

export function completeQontoOAuth(code: string, state: string): Promise<QontoConnectionStatus> {
  return apiRequestJson<QontoConnectionStatus>("POST", "/integrations/qonto/oauth/complete", {
    body: { code, state },
  });
}

export function connectQonto(login: string, secretKey: string): Promise<QontoConnectionStatus> {
  return apiRequestJson<QontoConnectionStatus>("POST", "/integrations/qonto/connect", {
    body: { login, secretKey },
  });
}

export function disconnectQonto(): Promise<QontoConnectionStatus> {
  return apiRequestJson<QontoConnectionStatus>("DELETE", "/integrations/qonto");
}

export function syncCaseToQonto(
  caseId: string,
  options: SyncCaseInvoiceOptions,
): Promise<SyncCaseToQontoResult> {
  const body: SyncCaseInvoiceOptions = {
    quoteId: options.quoteId,
  };
  if (options.invoiceNumber?.trim()) body.invoiceNumber = options.invoiceNumber.trim();
  if (options.invoiceKind) body.invoiceKind = options.invoiceKind;
  if (options.situationPercent != null) body.situationPercent = options.situationPercent;
  if (options.amountHt != null) body.amountHt = options.amountHt;
  return apiRequestJson<SyncCaseToQontoResult>("POST", `/integrations/qonto/cases/${caseId}/sync`, {
    body,
  });
}

export function getCaseInvoiceSync(caseId: string): Promise<CaseInvoiceSyncListResponse> {
  return apiRequestJson<CaseInvoiceSyncListResponse>(
    "GET",
    `/integrations/cases/${caseId}/invoice-sync`,
  );
}

export function finalizeCaseInvoice(
  caseId: string,
  syncId: string,
): Promise<CaseInvoiceSyncStatus> {
  return apiRequestJson<CaseInvoiceSyncStatus>(
    "POST",
    `/integrations/cases/${caseId}/invoice-sync/${syncId}/finalize`,
  );
}

export function refreshCaseInvoiceSync(
  caseId: string,
  syncId: string,
): Promise<CaseInvoiceSyncStatus> {
  return apiRequestJson<CaseInvoiceSyncStatus>(
    "POST",
    `/integrations/cases/${caseId}/invoice-sync/${syncId}/refresh`,
  );
}

export function refreshAllCaseInvoiceSyncs(caseId: string): Promise<CaseInvoiceSyncListResponse> {
  return apiRequestJson<CaseInvoiceSyncListResponse>(
    "POST",
    `/integrations/cases/${caseId}/invoice-sync/refresh`,
  );
}

export function deleteCaseInvoiceSync(
  caseId: string,
  syncId: string,
): Promise<CaseInvoiceSyncListResponse> {
  return apiRequestJson<CaseInvoiceSyncListResponse>(
    "DELETE",
    `/integrations/cases/${caseId}/invoice-sync/${syncId}`,
  );
}

export function listOrganizationInvoiceSyncs(filters?: {
  remoteStatus?: string;
  provider?: string;
  invoiceKind?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}): Promise<OrganizationInvoiceSyncsListResponse> {
  const params = new URLSearchParams();
  if (filters?.remoteStatus) params.set("remoteStatus", filters.remoteStatus);
  if (filters?.provider) params.set("provider", filters.provider);
  if (filters?.invoiceKind) params.set("invoiceKind", filters.invoiceKind);
  if (filters?.startDate) params.set("startDate", filters.startDate);
  if (filters?.endDate) params.set("endDate", filters.endDate);
  if (filters?.limit != null) params.set("limit", String(filters.limit));
  if (filters?.offset != null) params.set("offset", String(filters.offset));
  const qs = params.toString();
  return apiRequestJson<OrganizationInvoiceSyncsListResponse>(
    "GET",
    `/integrations/invoice-syncs${qs ? `?${qs}` : ""}`,
  );
}

export function getOrganizationInvoiceSyncStats(filters?: {
  startDate?: string;
  endDate?: string;
  provider?: string;
}): Promise<OrganizationInvoiceSyncStatsResponse> {
  const params = new URLSearchParams();
  if (filters?.startDate) params.set("startDate", filters.startDate);
  if (filters?.endDate) params.set("endDate", filters.endDate);
  if (filters?.provider) params.set("provider", filters.provider);
  const qs = params.toString();
  return apiRequestJson<OrganizationInvoiceSyncStatsResponse>(
    "GET",
    `/integrations/invoice-syncs/stats${qs ? `?${qs}` : ""}`,
  );
}
