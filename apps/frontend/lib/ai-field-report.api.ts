import type {
  GenerateFieldReportResponse,
  ConfirmFieldReportResponse,
  AiQuotaStatusResponse,
} from "@planwise/shared";
import { apiRequestJson } from "./api-client";

export function generateFieldReport(interventionId: string): Promise<GenerateFieldReportResponse> {
  return apiRequestJson<GenerateFieldReportResponse>("POST", "/ai/field-report/generate", {
    body: { interventionId },
    fallbackError: "Impossible de générer le compte-rendu",
  });
}

export function confirmFieldReport(
  interventionId: string,
  report: string,
): Promise<ConfirmFieldReportResponse> {
  return apiRequestJson<ConfirmFieldReportResponse>("POST", "/ai/field-report/confirm", {
    body: { interventionId, report },
    fallbackError: "Impossible de confirmer le compte-rendu",
  });
}

export function getFieldReportQuota(): Promise<AiQuotaStatusResponse> {
  return apiRequestJson<AiQuotaStatusResponse>("GET", "/ai/field-report/quota", {
    fallbackError: "Impossible de récupérer le quota",
  });
}
