/** API contracts for stock-service (articles, movements, intervention usage) */

export type StockMovementType = "in" | "out" | "adjustment";
export type StockStatus = "ok" | "low" | "out";

export interface InterventionArticleUsageResponse {
  articleId: string;
  articleName: string;
  articleReference?: string;
  unit: string;
  consumedQuantity: number;
  returnedQuantity: number;
  netQuantity: number;
  lastMovementAt?: string;
}

export interface AddInterventionArticleUsageBody {
  organizationId: string;
  caseId?: string;
  articleId: string;
  quantity: number;
  movementType?: "in" | "out";
  note?: string;
  actorUserId?: string;
  actorUserName?: string;
}

export interface CreateArticleBody {
  organizationId: string;
  name: string;
  reference: string;
  description?: string;
  unit?: string;
  initialStock?: number;
  reorderPoint?: number;
  targetStock?: number;
  isActive?: boolean;
}

export interface UpdateArticleBody {
  organizationId: string;
  name?: string;
  reference?: string;
  description?: string;
  unit?: string;
  reorderPoint?: number;
  targetStock?: number;
  isActive?: boolean;
}

export interface ArticleResponse {
  id: string;
  organizationId: string;
  name: string;
  reference: string;
  description?: string;
  unit: string;
  stockQuantity: number;
  reorderPoint: number;
  targetStock: number;
  isActive: boolean;
  lastMovementAt?: string;
  lowStock: boolean;
  stockStatus: StockStatus;
  suggestedReorderQuantity: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateArticleMovementBody {
  organizationId: string;
  articleId: string;
  movementType: StockMovementType;
  quantity: number;
  note?: string;
  reason?: string;
  interventionId?: string;
  caseId?: string;
  actorUserId?: string;
  actorUserName?: string;
}

export interface StockMovementResponse {
  id: string;
  organizationId: string;
  articleId: string;
  articleName: string;
  articleReference?: string;
  movementType: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  note?: string;
  reason?: string;
  interventionId?: string;
  caseId?: string;
  actorUserId?: string;
  actorUserName?: string;
  createdAt?: string;
}
