import type {
  CaseDashboardResponse,
  CaseHistoryEntryResponse,
  CaseResponse,
  CaseSummaryResponse,
  CaseTemplateResponse,
  DashboardStatFilter,
  DashboardTodoCaseItem,
  CompleteInterventionResponse,
  GeoLocation,
  InterventionResponse,
  StartInterventionResponse,
} from "@syncora/shared";
import { apiRequestJson, type ApiMethod } from "./api-client";

async function casesRequest<TResponse>(
  method: ApiMethod,
  path: string,
  body?: unknown,
): Promise<TResponse> {
  return apiRequestJson<TResponse>(method, path, typeof body === "undefined" ? {} : { body });
}

// ── Templates ──

export interface CreateTemplatePayload {
  name: string;
  description?: string;
  steps: {
    name: string;
    description?: string;
    order: number;
    todos: {
      label: string;
      description?: string;
      dashboardRule?: {
        showOnDashboard: boolean;
        visibility?: string;
        profileIds?: string[];
        userIds?: string[];
      };
    }[];
  }[];
}

export function listTemplates() {
  return casesRequest<CaseTemplateResponse[]>("GET", "/cases/templates");
}

export function getTemplate(templateId: string) {
  return casesRequest<CaseTemplateResponse>("GET", `/cases/templates/${templateId}`);
}

export function createTemplate(payload: CreateTemplatePayload) {
  return casesRequest<CaseTemplateResponse>("POST", "/cases/templates", payload);
}

export function updateTemplate(templateId: string, payload: Partial<CreateTemplatePayload>) {
  return casesRequest<CaseTemplateResponse>("PATCH", `/cases/templates/${templateId}`, payload);
}

export function deleteTemplate(templateId: string) {
  return casesRequest<{ deleted: true }>("DELETE", `/cases/templates/${templateId}`);
}

// ── Cases ──

export interface CreateCasePayload {
  templateId?: string;
  title: string;
  description?: string;
  priority?: string;
  assigneeIds?: string[];
  dueDate?: string;
  tags?: string[];
  customerId?: string;
}

export interface UpdateCasePayload {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeIds?: string[];
  dueDate?: string | null;
  tags?: string[];
  customerId?: string | null;
}

export function listCases(filters?: {
  status?: string;
  assigneeId?: string;
  priority?: string;
  search?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.assigneeId) params.set("assigneeId", filters.assigneeId);
  if (filters?.priority) params.set("priority", filters.priority);
  if (filters?.search) params.set("search", filters.search);
  const qs = params.toString();
  return casesRequest<CaseSummaryResponse[]>("GET", `/cases/items${qs ? `?${qs}` : ""}`);
}

export function getCase(caseId: string) {
  return casesRequest<CaseResponse>("GET", `/cases/items/${caseId}`);
}

export function createCase(payload: CreateCasePayload) {
  return casesRequest<CaseResponse>("POST", "/cases/items", payload);
}

export function updateCase(caseId: string, payload: UpdateCasePayload) {
  return casesRequest<CaseResponse>("PATCH", `/cases/items/${caseId}`, payload);
}

export function deleteCase(caseId: string) {
  return casesRequest<{ deleted: true }>("DELETE", `/cases/items/${caseId}`);
}

export function updateTodo(
  caseId: string,
  payload: { stepId: string; todoId: string; status: string },
) {
  return casesRequest<CaseResponse>("PUT", `/cases/items/${caseId}/todos`, payload);
}

// ── Interventions ──

export interface CreateInterventionPayload {
  caseId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  assignedTeamId?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
}

export interface UpdateInterventionPayload {
  title?: string;
  description?: string;
  status?: string;
  assigneeId?: string | null;
  assignedTeamId?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  notes?: string;
}

export function listInterventions(filters?: {
  caseId?: string;
  assigneeId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  /** "true" = interventions sans scheduledStart */
  unscheduled?: string;
  /** "true" = inclure les interventions des équipes du technicien lié à assigneeId */
  includeTeamAssignments?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.caseId) params.set("caseId", filters.caseId);
  if (filters?.assigneeId) params.set("assigneeId", filters.assigneeId);
  if (filters?.startDate) params.set("startDate", filters.startDate);
  if (filters?.endDate) params.set("endDate", filters.endDate);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.unscheduled) params.set("unscheduled", filters.unscheduled);
  if (filters?.includeTeamAssignments) {
    params.set("includeTeamAssignments", filters.includeTeamAssignments);
  }
  const qs = params.toString();
  return casesRequest<InterventionResponse[]>("GET", `/cases/interventions${qs ? `?${qs}` : ""}`);
}

export function getIntervention(interventionId: string) {
  return casesRequest<InterventionResponse>("GET", `/cases/interventions/${interventionId}`);
}

export function createIntervention(payload: CreateInterventionPayload) {
  return casesRequest<InterventionResponse>("POST", "/cases/interventions", payload);
}

export function updateIntervention(interventionId: string, payload: UpdateInterventionPayload) {
  return casesRequest<InterventionResponse>(
    "PATCH",
    `/cases/interventions/${interventionId}`,
    payload,
  );
}

export function deleteIntervention(interventionId: string) {
  return casesRequest<{ deleted: true }>("DELETE", `/cases/interventions/${interventionId}`);
}

export function startIntervention(interventionId: string, payload?: { location?: GeoLocation }) {
  return casesRequest<StartInterventionResponse>(
    "POST",
    `/cases/interventions/${interventionId}/start`,
    payload ?? {},
  );
}

export function completeIntervention(
  interventionId: string,
  payload?: { notes?: string; location?: GeoLocation },
) {
  return casesRequest<CompleteInterventionResponse>(
    "POST",
    `/cases/interventions/${interventionId}/complete`,
    payload ?? {},
  );
}

// ── History ──

export function listCaseHistory(caseId: string) {
  return casesRequest<CaseHistoryEntryResponse[]>("GET", `/cases/items/${caseId}/history`);
}

// ── Dashboard ──

export function getDashboard() {
  return casesRequest<CaseDashboardResponse>("GET", "/cases/dashboard");
}

export function getDashboardTodoCases(templateId: string, todoLabel: string) {
  const params = new URLSearchParams();
  params.set("templateId", templateId);
  params.set("todoLabel", todoLabel);
  return casesRequest<DashboardTodoCaseItem[]>(
    "GET",
    `/cases/dashboard/todo-cases?${params.toString()}`,
  );
}

export function getDashboardStatCases(filter: DashboardStatFilter) {
  const params = new URLSearchParams();
  params.set("filter", filter);
  return casesRequest<DashboardTodoCaseItem[]>(
    "GET",
    `/cases/dashboard/stat-cases?${params.toString()}`,
  );
}
