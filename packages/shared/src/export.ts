/** Contrats API exports (types de rapport, formats, filtres). */

export type ExportFormat = "pdf" | "xlsx" | "csv";

export type ExportType =
  | "case_summary"
  | "cases_list"
  | "users_list"
  | "customers_list"
  | "interventions_list"
  | "technicians_activity"
  | "mileage_report"
  | "dashboard_todo_cases";

export interface ExportCaseSummaryParams {
  caseId: string;
}

export interface ExportCasesListParams {
  status?: string;
  billingStatus?: string;
  priority?: string;
  assigneeId?: string;
  search?: string;
}

export interface ExportUsersListParams {
  search?: string;
}

export interface ExportCustomersListParams {
  search?: string;
  kind?: string;
}

export interface ExportInterventionsListParams {
  startDate?: string;
  endDate?: string;
  assigneeId?: string;
  teamId?: string;
  status?: string;
}

export interface ExportTechniciansActivityParams {
  startDate?: string;
  endDate?: string;
  technicianId?: string;
}

export interface ExportMileageReportParams {
  startDate?: string;
  endDate?: string;
  teamId?: string;
}

export interface ExportDashboardTodoCasesParams {
  templateId: string;
  todoLabel: string;
}

export interface ExportRequestBody {
  type: ExportType;
  format: ExportFormat;
  params?: Record<string, string | undefined>;
}

export interface ReportingStatsResponse {
  casesTotal: number;
  casesCompleted: number;
  casesInProgress: number;
  casesOverdue: number;
  interventionsTotal: number;
  interventionsCompleted: number;
  avgCompletionDays: number;
  techniciansActive: number;
  customersTotal: number;
}
