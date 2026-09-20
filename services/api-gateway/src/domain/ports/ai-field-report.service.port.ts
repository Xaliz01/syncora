import type {
  AuthUser,
  GenerateFieldReportResponse,
  ConfirmFieldReportResponse,
  AiQuotaStatusResponse,
} from "@planwise/shared";

export abstract class AbstractAiFieldReportService {
  abstract generate(user: AuthUser, interventionId: string): Promise<GenerateFieldReportResponse>;

  abstract confirm(
    user: AuthUser,
    interventionId: string,
    report: string,
  ): Promise<ConfirmFieldReportResponse>;

  abstract getQuotaStatus(user: AuthUser): Promise<AiQuotaStatusResponse>;
}
