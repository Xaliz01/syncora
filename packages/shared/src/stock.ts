/** API contracts for stock-service (articles, movements, intervention usage, locations) */

export type StockMovementType = "in" | "out" | "adjustment" | "transfer";
export type StockStatus = "ok" | "low" | "out";
export type StockLocationType = "warehouse" | "agence" | "vehicle";

// ── Stock locations ──

export interface CreateStockLocationBody {
  organizationId: string;
  name: string;
  type: StockLocationType;
  referenceId?: string;
  address?: string;
}

export interface UpdateStockLocationBody {
  organizationId: string;
  name?: string;
  address?: string;
}

export interface StockLocationResponse {
  id: string;
  organizationId: string;
  name: string;
  type: StockLocationType;
  referenceId?: string;
  referenceName?: string;
  address?: string;
  isDefault: boolean;
  articleCount?: number;
  createdAt?: string;
  updatedAt?: string;
  isTestData?: boolean;
}

export interface LocationStockEntry {
  locationId: string;
  locationName?: string;
  quantity: number;
}

export interface CreateStockTransferBody {
  organizationId: string;
  articleId: string;
  sourceLocationId: string;
  destinationLocationId: string;
  quantity: number;
  note?: string;
  actorUserId?: string;
  actorUserName?: string;
}

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
  locationId?: string;
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
  defaultPrice?: number;
  initialStock?: number;
  locationId?: string;
  reorderPoint?: number;
  targetStock?: number;
  isActive?: boolean;
  isTestData?: boolean;
}

export interface UpdateArticleBody {
  organizationId: string;
  name?: string;
  reference?: string;
  description?: string;
  unit?: string;
  defaultPrice?: number | null;
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
  defaultPrice?: number;
  stockQuantity: number;
  reorderPoint: number;
  targetStock: number;
  isActive: boolean;
  lastMovementAt?: string;
  lowStock: boolean;
  stockStatus: StockStatus;
  suggestedReorderQuantity: number;
  locationStocks?: LocationStockEntry[];
  createdAt?: string;
  updatedAt?: string;
  isTestData?: boolean;
}

export interface CreateArticleMovementBody {
  organizationId: string;
  articleId: string;
  movementType: StockMovementType;
  quantity: number;
  note?: string;
  reason?: string;
  locationId?: string;
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
  locationId?: string;
  locationName?: string;
  destinationLocationId?: string;
  destinationLocationName?: string;
  interventionId?: string;
  caseId?: string;
  actorUserId?: string;
  actorUserName?: string;
  createdAt?: string;
}
