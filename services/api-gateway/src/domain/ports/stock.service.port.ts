import type {
  ArticleResponse,
  AuthUser,
  InterventionArticleUsageResponse,
  StockLocationResponse,
  StockLocationType,
  StockMovementResponse,
} from "@planwise/shared";

export interface CreateArticleForOrgBody {
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

export interface UpdateArticleForOrgBody {
  name?: string;
  reference?: string;
  description?: string;
  unit?: string;
  defaultPrice?: number | null;
  reorderPoint?: number;
  targetStock?: number;
  isActive?: boolean;
}

export interface CreateArticleMovementForOrgBody {
  articleId: string;
  movementType: "in" | "out" | "adjustment";
  quantity: number;
  note?: string;
  reason?: string;
  locationId?: string;
  interventionId?: string;
  caseId?: string;
}

export interface AddInterventionArticleUsageForOrgBody {
  caseId?: string;
  articleId: string;
  quantity: number;
  movementType?: "in" | "out";
  locationId?: string;
  note?: string;
}

export interface CreateStockLocationForOrgBody {
  name: string;
  type: StockLocationType;
  referenceId?: string;
  address?: string;
}

export interface UpdateStockLocationForOrgBody {
  name?: string;
  address?: string;
}

export interface CreateStockTransferForOrgBody {
  articleId: string;
  sourceLocationId: string;
  destinationLocationId: string;
  quantity: number;
  note?: string;
}

export abstract class AbstractStockGatewayService {
  abstract createArticle(user: AuthUser, body: CreateArticleForOrgBody): Promise<ArticleResponse>;
  abstract listArticles(
    user: AuthUser,
    filters?: {
      search?: string;
      lowStockOnly?: boolean;
      activeOnly?: boolean;
      locationId?: string;
    },
  ): Promise<ArticleResponse[]>;
  abstract getArticle(user: AuthUser, articleId: string): Promise<ArticleResponse>;
  abstract updateArticle(
    user: AuthUser,
    articleId: string,
    body: UpdateArticleForOrgBody,
  ): Promise<ArticleResponse>;
  abstract deleteArticle(user: AuthUser, articleId: string): Promise<{ deleted: true }>;
  abstract createArticleMovement(
    user: AuthUser,
    body: CreateArticleMovementForOrgBody,
  ): Promise<StockMovementResponse>;
  abstract listArticleMovements(
    user: AuthUser,
    filters?: {
      articleId?: string;
      interventionId?: string;
      caseId?: string;
      locationId?: string;
      limit?: number;
    },
  ): Promise<StockMovementResponse[]>;
  abstract addInterventionArticleUsage(
    user: AuthUser,
    interventionId: string,
    body: AddInterventionArticleUsageForOrgBody,
  ): Promise<StockMovementResponse>;
  abstract getInterventionUsage(
    user: AuthUser,
    interventionId: string,
  ): Promise<InterventionArticleUsageResponse[]>;
  abstract createStockLocation(
    user: AuthUser,
    body: CreateStockLocationForOrgBody,
  ): Promise<StockLocationResponse>;
  abstract listStockLocations(user: AuthUser): Promise<StockLocationResponse[]>;
  abstract getStockLocation(user: AuthUser, locationId: string): Promise<StockLocationResponse>;
  abstract updateStockLocation(
    user: AuthUser,
    locationId: string,
    body: UpdateStockLocationForOrgBody,
  ): Promise<StockLocationResponse>;
  abstract deleteStockLocation(user: AuthUser, locationId: string): Promise<{ deleted: true }>;
  abstract createStockTransfer(
    user: AuthUser,
    body: CreateStockTransferForOrgBody,
  ): Promise<StockMovementResponse>;
}
