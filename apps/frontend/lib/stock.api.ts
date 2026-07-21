import type {
  ArticleResponse,
  ArticlesListResponse,
  InterventionArticleUsageResponse,
  StockLocationResponse,
  StockLocationType,
  StockMovementResponse,
} from "@planwise/shared";
import { apiRequestJson, type ApiMethod } from "./api-client";

async function stockRequest<TResponse>(
  method: ApiMethod,
  path: string,
  body?: unknown,
): Promise<TResponse> {
  return apiRequestJson<TResponse>(method, path, typeof body === "undefined" ? {} : { body });
}

// ── Article payloads ──

export interface CreateArticlePayload {
  name: string;
  reference: string;
  description?: string;
  unit?: string;
  defaultPrice?: number;
  initialStock?: number;
  locationId?: string;
  reorderPoint?: number;
  targetStock?: number;
  isActive?: boolean;
}

export interface UpdateArticlePayload {
  name?: string;
  reference?: string;
  description?: string;
  unit?: string;
  defaultPrice?: number | null;
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
  locationId?: string;
  interventionId?: string;
  caseId?: string;
}

export interface AddInterventionArticleUsagePayload {
  caseId?: string;
  articleId: string;
  quantity: number;
  movementType?: "in" | "out";
  locationId?: string;
  note?: string;
}

// ── Location payloads ──

export interface CreateStockLocationPayload {
  name: string;
  type: StockLocationType;
  referenceId?: string;
  address?: string;
}

export interface UpdateStockLocationPayload {
  name?: string;
  address?: string;
}

export interface CreateStockTransferPayload {
  articleId: string;
  sourceLocationId: string;
  destinationLocationId: string;
  quantity: number;
  note?: string;
}

// ── Articles ──

export function listArticles(filters?: {
  search?: string;
  lowStockOnly?: boolean;
  activeOnly?: boolean;
  locationId?: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (typeof filters?.lowStockOnly === "boolean") {
    params.set("lowStockOnly", String(filters.lowStockOnly));
  }
  if (typeof filters?.activeOnly === "boolean") {
    params.set("activeOnly", String(filters.activeOnly));
  }
  if (filters?.locationId) params.set("locationId", filters.locationId);
  if (filters?.limit != null) params.set("limit", String(filters.limit));
  if (filters?.offset != null) params.set("offset", String(filters.offset));
  const qs = params.toString();
  return stockRequest<ArticlesListResponse>("GET", `/stock/articles${qs ? `?${qs}` : ""}`);
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

// ── Movements ──

export function createArticleMovement(payload: CreateArticleMovementPayload) {
  return stockRequest<StockMovementResponse>("POST", "/stock/movements", payload);
}

export function listArticleMovements(filters?: {
  articleId?: string;
  interventionId?: string;
  caseId?: string;
  locationId?: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.articleId) params.set("articleId", filters.articleId);
  if (filters?.interventionId) params.set("interventionId", filters.interventionId);
  if (filters?.caseId) params.set("caseId", filters.caseId);
  if (filters?.locationId) params.set("locationId", filters.locationId);
  if (typeof filters?.limit === "number") params.set("limit", String(filters.limit));
  const qs = params.toString();
  return stockRequest<StockMovementResponse[]>("GET", `/stock/movements${qs ? `?${qs}` : ""}`);
}

// ── Intervention usage ──

export function addInterventionArticleUsage(
  interventionId: string,
  payload: AddInterventionArticleUsagePayload,
) {
  return stockRequest<StockMovementResponse>(
    "POST",
    `/stock/interventions/${interventionId}/articles`,
    payload,
  );
}

export function getInterventionUsage(interventionId: string) {
  return stockRequest<InterventionArticleUsageResponse[]>(
    "GET",
    `/stock/interventions/${interventionId}/usage`,
  );
}

// ── Stock locations ──

export function listStockLocations() {
  return stockRequest<StockLocationResponse[]>("GET", "/stock/locations");
}

export function getStockLocation(locationId: string) {
  return stockRequest<StockLocationResponse>("GET", `/stock/locations/${locationId}`);
}

export function createStockLocation(payload: CreateStockLocationPayload) {
  return stockRequest<StockLocationResponse>("POST", "/stock/locations", payload);
}

export function updateStockLocation(locationId: string, payload: UpdateStockLocationPayload) {
  return stockRequest<StockLocationResponse>("PATCH", `/stock/locations/${locationId}`, payload);
}

export function deleteStockLocation(locationId: string) {
  return stockRequest<{ deleted: true }>("DELETE", `/stock/locations/${locationId}`);
}

// ── Transfers ──

export function createStockTransfer(payload: CreateStockTransferPayload) {
  return stockRequest<StockMovementResponse>("POST", "/stock/transfers", payload);
}
