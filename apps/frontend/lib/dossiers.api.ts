import type {
  DashboardResponse,
  DossierResponse,
  DossierSummaryResponse,
  DossierTemplateResponse,
  InterventionResponse
} from "@syncora/shared";
import { getToken } from "./auth.api";

const API_BASE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
  "http://localhost:3000/api";

type ApiMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

async function dossierRequest<TResponse>(
  method: ApiMethod,
  path: string,
  body?: unknown
): Promise<TResponse> {
  const token = getToken();
  if (!token) throw new Error("Session expirée");

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: typeof body === "undefined" ? undefined : JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const message = (err as { message?: string | string[] }).message;
    if (Array.isArray(message)) throw new Error(message.join(", "));
    throw new Error(message ?? "Erreur API");
  }

  return response.json() as Promise<TResponse>;
}

// ── Templates ──

export interface CreateTemplatePayload {
  name: string;
  description?: string;
  steps: {
    name: string;
    description?: string;
    order: number;
    todos: { label: string; description?: string }[];
  }[];
}

export function listTemplates() {
  return dossierRequest<DossierTemplateResponse[]>("GET", "/dossiers/templates");
}

export function getTemplate(templateId: string) {
  return dossierRequest<DossierTemplateResponse>("GET", `/dossiers/templates/${templateId}`);
}

export function createTemplate(payload: CreateTemplatePayload) {
  return dossierRequest<DossierTemplateResponse>("POST", "/dossiers/templates", payload);
}

export function updateTemplate(templateId: string, payload: Partial<CreateTemplatePayload>) {
  return dossierRequest<DossierTemplateResponse>("PATCH", `/dossiers/templates/${templateId}`, payload);
}

export function deleteTemplate(templateId: string) {
  return dossierRequest<{ deleted: true }>("DELETE", `/dossiers/templates/${templateId}`);
}

// ── Dossiers ──

export interface CreateDossierPayload {
  templateId?: string;
  title: string;
  description?: string;
  priority?: string;
  assigneeId?: string;
  dueDate?: string;
  tags?: string[];
}

export interface UpdateDossierPayload {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeId?: string | null;
  dueDate?: string | null;
  tags?: string[];
}

export function listDossiers(filters?: {
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
  return dossierRequest<DossierSummaryResponse[]>(
    "GET",
    `/dossiers/items${qs ? `?${qs}` : ""}`
  );
}

export function getDossier(dossierId: string) {
  return dossierRequest<DossierResponse>("GET", `/dossiers/items/${dossierId}`);
}

export function createDossier(payload: CreateDossierPayload) {
  return dossierRequest<DossierResponse>("POST", "/dossiers/items", payload);
}

export function updateDossier(dossierId: string, payload: UpdateDossierPayload) {
  return dossierRequest<DossierResponse>("PATCH", `/dossiers/items/${dossierId}`, payload);
}

export function deleteDossier(dossierId: string) {
  return dossierRequest<{ deleted: true }>("DELETE", `/dossiers/items/${dossierId}`);
}

export function updateTodo(dossierId: string, payload: { stepId: string; todoId: string; status: string }) {
  return dossierRequest<DossierResponse>("PUT", `/dossiers/items/${dossierId}/todos`, payload);
}

// ── Interventions ──

export interface CreateInterventionPayload {
  dossierId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
}

export interface UpdateInterventionPayload {
  title?: string;
  description?: string;
  status?: string;
  assigneeId?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  notes?: string;
}

export function listInterventions(filters?: {
  dossierId?: string;
  assigneeId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.dossierId) params.set("dossierId", filters.dossierId);
  if (filters?.assigneeId) params.set("assigneeId", filters.assigneeId);
  if (filters?.startDate) params.set("startDate", filters.startDate);
  if (filters?.endDate) params.set("endDate", filters.endDate);
  if (filters?.status) params.set("status", filters.status);
  const qs = params.toString();
  return dossierRequest<InterventionResponse[]>(
    "GET",
    `/dossiers/interventions${qs ? `?${qs}` : ""}`
  );
}

export function getIntervention(interventionId: string) {
  return dossierRequest<InterventionResponse>(
    "GET",
    `/dossiers/interventions/${interventionId}`
  );
}

export function createIntervention(payload: CreateInterventionPayload) {
  return dossierRequest<InterventionResponse>("POST", "/dossiers/interventions", payload);
}

export function updateIntervention(interventionId: string, payload: UpdateInterventionPayload) {
  return dossierRequest<InterventionResponse>(
    "PATCH",
    `/dossiers/interventions/${interventionId}`,
    payload
  );
}

export function deleteIntervention(interventionId: string) {
  return dossierRequest<{ deleted: true }>(
    "DELETE",
    `/dossiers/interventions/${interventionId}`
  );
}

// ── Dashboard ──

export function getDashboard() {
  return dossierRequest<DashboardResponse>("GET", "/dossiers/dashboard");
}
