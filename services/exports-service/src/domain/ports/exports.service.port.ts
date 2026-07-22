import type {
  ExportFormat,
  ReportingStatsResponse,
  ExportInvoicesListParams,
} from "@planwise/shared";

export interface ExportResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

export abstract class AbstractExportsService {
  abstract exportCaseSummaryPdf(organizationId: string, caseId: string): Promise<ExportResult>;

  abstract exportCasesList(
    organizationId: string,
    format: ExportFormat,
    filters?: {
      status?: string;
      billingStatus?: string;
      priority?: string;
      assigneeId?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
    },
  ): Promise<ExportResult>;

  abstract exportUsersList(organizationId: string, format: ExportFormat): Promise<ExportResult>;

  abstract exportCustomersList(
    organizationId: string,
    format: ExportFormat,
    filters?: { search?: string; kind?: string },
  ): Promise<ExportResult>;

  abstract exportInterventionsList(
    organizationId: string,
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
    organizationId: string,
    format: ExportFormat,
    filters?: { startDate?: string; endDate?: string; technicianId?: string },
  ): Promise<ExportResult>;

  abstract exportMileageReport(
    organizationId: string,
    format: ExportFormat,
    filters?: { startDate?: string; endDate?: string; teamId?: string },
  ): Promise<ExportResult>;

  abstract exportDashboardTodoCases(
    organizationId: string,
    format: ExportFormat,
    params: { userId: string; userProfileId?: string; templateId: string; todoLabel: string },
  ): Promise<ExportResult>;

  abstract exportInvoicesList(
    organizationId: string,
    format: ExportFormat,
    filters?: ExportInvoicesListParams,
  ): Promise<ExportResult>;

  abstract getReportingStats(
    organizationId: string,
    filters?: { startDate?: string; endDate?: string },
  ): Promise<ReportingStatsResponse>;
}
