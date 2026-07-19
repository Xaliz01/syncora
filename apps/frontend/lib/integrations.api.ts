import type {
  PennylaneConnectionStatus,
  PennylaneOAuthStartResponse,
  QontoConnectionStatus,
  QontoOAuthStartResponse,
  SyncCaseToPennylaneResult,
  SyncCaseToQontoResult,
} from "@planwise/shared";
import { apiRequestJson } from "./api-client";

export function getPennylaneStatus(): Promise<PennylaneConnectionStatus> {
  return apiRequestJson<PennylaneConnectionStatus>("GET", "/integrations/pennylane");
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
  options?: { quoteId?: string },
): Promise<SyncCaseToPennylaneResult> {
  return apiRequestJson<SyncCaseToPennylaneResult>(
    "POST",
    `/integrations/pennylane/cases/${caseId}/sync`,
    options?.quoteId ? { body: { quoteId: options.quoteId } } : {},
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
  options?: { quoteId?: string; invoiceNumber?: string },
): Promise<SyncCaseToQontoResult> {
  const body: { quoteId?: string; invoiceNumber?: string } = {};
  if (options?.quoteId) body.quoteId = options.quoteId;
  if (options?.invoiceNumber?.trim()) body.invoiceNumber = options.invoiceNumber.trim();
  return apiRequestJson<SyncCaseToQontoResult>(
    "POST",
    `/integrations/qonto/cases/${caseId}/sync`,
    Object.keys(body).length > 0 ? { body } : {},
  );
}
