import type { AuthUser, ExportFormat, ReportingStatsResponse } from "@syncora/shared";

export interface ExportResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

export abstract class AbstractExportsGatewayService {
  abstract exportCaseSummaryPdf(user: AuthUser, caseId: string): Promise<ExportResult>;

  abstract exportCasesList(
    user: AuthUser,
    format: ExportFormat,
    filters?: { status?: string; priority?: string; assigneeId?: string; search?: string },
  ): Promise<ExportResult>;

  abstract exportUsersList(user: AuthUser, format: ExportFormat): Promise<ExportResult>;

  abstract exportCustomersList(
    user: AuthUser,
    format: ExportFormat,
    filters?: { search?: string; kind?: string },
  ): Promise<ExportResult>;

  abstract exportInterventionsList(
    user: AuthUser,
    format: ExportFormat,
    filters?: {
      startDate?: string;
      endDate?: string;
      assigneeId?: string;
      teamId?: string;
      status?: string;
    },
  ): Promise<ExportResult>;

  abstract exportTechniciansActivity(
    user: AuthUser,
    format: ExportFormat,
    filters?: { startDate?: string; endDate?: string; technicianId?: string },
  ): Promise<ExportResult>;

  abstract exportMileageReport(
    user: AuthUser,
    format: ExportFormat,
    filters?: { startDate?: string; endDate?: string; teamId?: string },
  ): Promise<ExportResult>;

  abstract exportDashboardTodoCases(
    user: AuthUser,
    format: ExportFormat,
    params: { templateId: string; todoLabel: string },
  ): Promise<ExportResult>;

  abstract getReportingStats(user: AuthUser): Promise<ReportingStatsResponse>;
}
