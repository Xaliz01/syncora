import type {
  ArticleResponse,
  AuthUser,
  InterventionArticleUsageResponse,
  StockMovementResponse
} from "@syncora/shared";

export interface CreateArticleForOrgBody {
  name: string;
  reference: string;
  description?: string;
  unit?: string;
  initialStock?: number;
  reorderPoint?: number;
  targetStock?: number;
  isActive?: boolean;
}

export interface UpdateArticleForOrgBody {
  name?: string;
  reference?: string;
  description?: string;
  unit?: string;
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
  interventionId?: string;
  caseId?: string;
}

export interface AddInterventionArticleUsageForOrgBody {
  caseId?: string;
  articleId: string;
  quantity: number;
  movementType?: "in" | "out";
  note?: string;
}

export abstract class AbstractStockGatewayService {
  abstract createArticle(user: AuthUser, body: CreateArticleForOrgBody): Promise<ArticleResponse>;
  abstract listArticles(
    user: AuthUser,
    filters?: { search?: string; lowStockOnly?: boolean; activeOnly?: boolean }
  ): Promise<ArticleResponse[]>;
  abstract getArticle(user: AuthUser, articleId: string): Promise<ArticleResponse>;
  abstract updateArticle(
    user: AuthUser,
    articleId: string,
    body: UpdateArticleForOrgBody
  ): Promise<ArticleResponse>;
  abstract deleteArticle(user: AuthUser, articleId: string): Promise<{ deleted: true }>;
  abstract createArticleMovement(
    user: AuthUser,
    body: CreateArticleMovementForOrgBody
  ): Promise<StockMovementResponse>;
  abstract listArticleMovements(
    user: AuthUser,
    filters?: { articleId?: string; interventionId?: string; caseId?: string; limit?: number }
  ): Promise<StockMovementResponse[]>;
  abstract addInterventionArticleUsage(
    user: AuthUser,
    interventionId: string,
    body: AddInterventionArticleUsageForOrgBody
  ): Promise<StockMovementResponse>;
  abstract getInterventionUsage(
    user: AuthUser,
    interventionId: string
  ): Promise<InterventionArticleUsageResponse[]>;
}
