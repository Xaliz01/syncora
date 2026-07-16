import type { ReportingStatsResponse } from "@planwise/shared";
import { apiRequestJson } from "./api-client";
import { API_BASE, getAccessToken } from "./api-client";

async function downloadExport(path: string, defaultFilename: string): Promise<void> {
  const token = getAccessToken();
  if (!token) throw new Error("Session expirée");

  const response = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      (err as { message?: string }).message ?? "Erreur lors de la génération de l'export",
    );
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition");
  let filename = defaultFilename;
  if (disposition) {
    const match = disposition.match(/filename="?([^";\n]+)"?/);
    if (match) filename = match[1];
  }

  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(blobUrl);
}

// ── Case exports ──

export function exportCaseSummaryPdf(caseId: string): Promise<void> {
  return downloadExport(`/exports/cases/${caseId}/pdf`, `dossier-${caseId}.pdf`);
}

export function exportCasesList(
  format: "pdf" | "xlsx" | "csv",
  filters?: {
    status?: string;
    billingStatus?: string;
    priority?: string;
    assigneeId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  },
): Promise<void> {
  const params = new URLSearchParams();
  params.set("format", format);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.billingStatus) params.set("billingStatus", filters.billingStatus);
  if (filters?.priority) params.set("priority", filters.priority);
  if (filters?.assigneeId) params.set("assigneeId", filters.assigneeId);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.startDate) params.set("startDate", filters.startDate);
  if (filters?.endDate) params.set("endDate", filters.endDate);
  return downloadExport(`/exports/cases?${params.toString()}`, `liste-dossiers.${format}`);
}

// ── Users export ──

export function exportUsersList(format: "pdf" | "xlsx" | "csv"): Promise<void> {
  return downloadExport(`/exports/users?format=${format}`, `liste-utilisateurs.${format}`);
}

// ── Customers export ──

export function exportCustomersList(
  format: "pdf" | "xlsx" | "csv",
  filters?: { search?: string; kind?: string },
): Promise<void> {
  const params = new URLSearchParams();
  params.set("format", format);
  if (filters?.search) params.set("search", filters.search);
  if (filters?.kind) params.set("kind", filters.kind);
  return downloadExport(`/exports/customers?${params.toString()}`, `liste-clients.${format}`);
}

// ── Interventions export ──

export function exportInterventionsList(
  format: "pdf" | "xlsx" | "csv",
  filters?: {
    startDate?: string;
    endDate?: string;
    assigneeId?: string;
    teamId?: string;
    status?: string;
  },
): Promise<void> {
  const params = new URLSearchParams();
  params.set("format", format);
  if (filters?.startDate) params.set("startDate", filters.startDate);
  if (filters?.endDate) params.set("endDate", filters.endDate);
  if (filters?.assigneeId) params.set("assigneeId", filters.assigneeId);
  if (filters?.teamId) params.set("teamId", filters.teamId);
  if (filters?.status) params.set("status", filters.status);
  return downloadExport(
    `/exports/interventions?${params.toString()}`,
    `liste-interventions.${format}`,
  );
}

// ── Technicians activity export ──

export function exportTechniciansActivity(
  format: "pdf" | "xlsx" | "csv",
  filters?: { startDate?: string; endDate?: string; technicianId?: string },
): Promise<void> {
  const params = new URLSearchParams();
  params.set("format", format);
  if (filters?.startDate) params.set("startDate", filters.startDate);
  if (filters?.endDate) params.set("endDate", filters.endDate);
  if (filters?.technicianId) params.set("technicianId", filters.technicianId);
  return downloadExport(
    `/exports/technicians-activity?${params.toString()}`,
    `activite-techniciens.${format}`,
  );
}

// ── Mileage report export ──

export function exportMileageReport(
  format: "pdf" | "xlsx" | "csv",
  filters?: { startDate?: string; endDate?: string; teamId?: string },
): Promise<void> {
  const params = new URLSearchParams();
  params.set("format", format);
  if (filters?.startDate) params.set("startDate", filters.startDate);
  if (filters?.endDate) params.set("endDate", filters.endDate);
  if (filters?.teamId) params.set("teamId", filters.teamId);
  return downloadExport(
    `/exports/mileage-report?${params.toString()}`,
    `rapport-kilometrique.${format}`,
  );
}

// ── Dashboard TODO cases export ──

export function exportDashboardTodoCases(
  format: "pdf" | "xlsx" | "csv",
  params: { templateId: string; todoLabel: string },
): Promise<void> {
  const qs = new URLSearchParams();
  qs.set("format", format);
  qs.set("templateId", params.templateId);
  qs.set("todoLabel", params.todoLabel);
  return downloadExport(
    `/exports/dashboard-todo-cases?${qs.toString()}`,
    `taches-dossiers.${format}`,
  );
}

// ── Reporting stats ──

export function getReportingStats(filters?: {
  startDate?: string;
  endDate?: string;
}): Promise<ReportingStatsResponse> {
  const params = new URLSearchParams();
  if (filters?.startDate) params.set("startDate", filters.startDate);
  if (filters?.endDate) params.set("endDate", filters.endDate);
  const qs = params.toString();
  return apiRequestJson<ReportingStatsResponse>(
    "GET",
    `/exports/reporting/stats${qs ? `?${qs}` : ""}`,
  );
}
