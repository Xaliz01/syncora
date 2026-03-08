import type {
  ArticleResponse,
  CaseDashboardResponse,
  CaseResponse,
  CaseSummaryResponse,
  CaseTemplateResponse,
  InterventionResponse,
  StockMovementResponse
} from "@syncora/shared";
import { getToken } from "./auth.api";

const API_BASE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
  "http://localhost:3000/api";

type ApiMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

async function casesRequest<TResponse>(
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
  assigneeId?: string;
  dueDate?: string;
  tags?: string[];
}

export interface UpdateCasePayload {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeId?: string | null;
  dueDate?: string | null;
  tags?: string[];
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
  return casesRequest<CaseSummaryResponse[]>(
    "GET",
    `/cases/items${qs ? `?${qs}` : ""}`
  );
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

export function updateTodo(caseId: string, payload: { stepId: string; todoId: string; status: string }) {
  return casesRequest<CaseResponse>("PUT", `/cases/items/${caseId}/todos`, payload);
}

// ── Interventions ──

export interface CreateInterventionPayload {
  caseId: string;
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

export interface AddInterventionArticleUsagePayload {
  articleId: string;
  quantity: number;
  movementType?: "in" | "out";
  note?: string;
}

export function listInterventions(filters?: {
  caseId?: string;
  assigneeId?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.caseId) params.set("caseId", filters.caseId);
  if (filters?.assigneeId) params.set("assigneeId", filters.assigneeId);
  if (filters?.startDate) params.set("startDate", filters.startDate);
  if (filters?.endDate) params.set("endDate", filters.endDate);
  if (filters?.status) params.set("status", filters.status);
  const qs = params.toString();
  return casesRequest<InterventionResponse[]>(
    "GET",
    `/cases/interventions${qs ? `?${qs}` : ""}`
  );
}

export function getIntervention(interventionId: string) {
  return casesRequest<InterventionResponse>(
    "GET",
    `/cases/interventions/${interventionId}`
  );
}

export function createIntervention(payload: CreateInterventionPayload) {
  return casesRequest<InterventionResponse>("POST", "/cases/interventions", payload);
}

export function updateIntervention(interventionId: string, payload: UpdateInterventionPayload) {
  return casesRequest<InterventionResponse>(
    "PATCH",
    `/cases/interventions/${interventionId}`,
    payload
  );
}

export function addInterventionArticleUsage(
  interventionId: string,
  payload: AddInterventionArticleUsagePayload
) {
  return casesRequest<InterventionResponse>(
    "POST",
    `/cases/interventions/${interventionId}/articles`,
    payload
  );
}

export function deleteIntervention(interventionId: string) {
  return casesRequest<{ deleted: true }>(
    "DELETE",
    `/cases/interventions/${interventionId}`
  );
}

// ── Articles / stock ──

export interface CreateArticlePayload {
  name: string;
  reference: string;
  description?: string;
  unit?: string;
  initialStock?: number;
  reorderPoint?: number;
  targetStock?: number;
  isActive?: boolean;
}

export interface UpdateArticlePayload {
  name?: string;
  reference?: string;
  description?: string;
  unit?: string;
  reorderPoint?: number;
  targetStock?: number;
  isActive?: boolean;
}

export interface CreateArticleMovementPayload {
  articleId: string;
  movementType: "in" | "out" | "adjustment";
  quantity: number;
  note?: string;
  reason?: string;
  interventionId?: string;
  caseId?: string;
}

export function listArticles(filters?: {
  search?: string;
  lowStockOnly?: boolean;
  activeOnly?: boolean;
}) {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (typeof filters?.lowStockOnly === "boolean") {
    params.set("lowStockOnly", String(filters.lowStockOnly));
  }
  if (typeof filters?.activeOnly === "boolean") {
    params.set("activeOnly", String(filters.activeOnly));
  }
  const qs = params.toString();
  return casesRequest<ArticleResponse[]>("GET", `/cases/articles${qs ? `?${qs}` : ""}`);
}

export function getArticle(articleId: string) {
  return casesRequest<ArticleResponse>("GET", `/cases/articles/${articleId}`);
}

export function createArticle(payload: CreateArticlePayload) {
  return casesRequest<ArticleResponse>("POST", "/cases/articles", payload);
}

export function updateArticle(articleId: string, payload: UpdateArticlePayload) {
  return casesRequest<ArticleResponse>("PATCH", `/cases/articles/${articleId}`, payload);
}

export function deleteArticle(articleId: string) {
  return casesRequest<{ deleted: true }>("DELETE", `/cases/articles/${articleId}`);
}

export function createArticleMovement(payload: CreateArticleMovementPayload) {
  return casesRequest<StockMovementResponse>("POST", "/cases/articles/movements", payload);
}

export function listArticleMovements(filters?: {
  articleId?: string;
  interventionId?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.articleId) params.set("articleId", filters.articleId);
  if (filters?.interventionId) params.set("interventionId", filters.interventionId);
  if (typeof filters?.limit === "number") params.set("limit", String(filters.limit));
  const qs = params.toString();
  return casesRequest<StockMovementResponse[]>(
    "GET",
    `/cases/articles/movements/list${qs ? `?${qs}` : ""}`
  );
}

// ── Dashboard ──

export function getDashboard() {
  return casesRequest<CaseDashboardResponse>("GET", "/cases/dashboard");
}
