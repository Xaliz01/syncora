import type {
  ArticleResponse,
  InterventionArticleUsageResponse,
  StockMovementResponse
} from "@syncora/shared";
import { apiRequestJson, type ApiMethod } from "./api-client";

async function stockRequest<TResponse>(
  method: ApiMethod,
  path: string,
  body?: unknown
): Promise<TResponse> {
  return apiRequestJson<TResponse>(method, path, typeof body === "undefined" ? {} : { body });
}

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

export interface AddInterventionArticleUsagePayload {
  caseId?: string;
  articleId: string;
  quantity: number;
  movementType?: "in" | "out";
  note?: string;
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
  return stockRequest<ArticleResponse[]>("GET", `/stock/articles${qs ? `?${qs}` : ""}`);
}

export function getArticle(articleId: string) {
  return stockRequest<ArticleResponse>("GET", `/stock/articles/${articleId}`);
}

export function createArticle(payload: CreateArticlePayload) {
  return stockRequest<ArticleResponse>("POST", "/stock/articles", payload);
}

export function updateArticle(articleId: string, payload: UpdateArticlePayload) {
  return stockRequest<ArticleResponse>("PATCH", `/stock/articles/${articleId}`, payload);
}

export function deleteArticle(articleId: string) {
  return stockRequest<{ deleted: true }>("DELETE", `/stock/articles/${articleId}`);
}

export function createArticleMovement(payload: CreateArticleMovementPayload) {
  return stockRequest<StockMovementResponse>("POST", "/stock/movements", payload);
}

export function listArticleMovements(filters?: {
  articleId?: string;
  interventionId?: string;
  caseId?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.articleId) params.set("articleId", filters.articleId);
  if (filters?.interventionId) params.set("interventionId", filters.interventionId);
  if (filters?.caseId) params.set("caseId", filters.caseId);
  if (typeof filters?.limit === "number") params.set("limit", String(filters.limit));
  const qs = params.toString();
  return stockRequest<StockMovementResponse[]>("GET", `/stock/movements${qs ? `?${qs}` : ""}`);
}

export function addInterventionArticleUsage(
  interventionId: string,
  payload: AddInterventionArticleUsagePayload
) {
  return stockRequest<StockMovementResponse>(
    "POST",
    `/stock/interventions/${interventionId}/articles`,
    payload
  );
}

export function getInterventionUsage(interventionId: string) {
  return stockRequest<InterventionArticleUsageResponse[]>(
    "GET",
    `/stock/interventions/${interventionId}/usage`
  );
}
