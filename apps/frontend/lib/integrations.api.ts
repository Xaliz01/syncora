import type {
  PennylaneConnectionStatus,
  PennylaneOAuthStartResponse,
  SyncCaseToPennylaneResult,
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
