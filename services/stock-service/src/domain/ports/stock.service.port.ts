import type {
  AddInterventionArticleUsageBody,
  ArticleResponse,
  CreateArticleBody,
  CreateArticleMovementBody,
  InterventionArticleUsageResponse,
  StockMovementResponse,
  UpdateArticleBody,
} from "@syncora/shared";

export abstract class AbstractStockService {
  abstract createArticle(body: CreateArticleBody): Promise<ArticleResponse>;
  abstract listArticles(
    organizationId: string,
    filters?: { search?: string; lowStockOnly?: boolean; activeOnly?: boolean },
  ): Promise<ArticleResponse[]>;
  abstract getArticle(id: string, organizationId: string): Promise<ArticleResponse>;
  abstract updateArticle(id: string, body: UpdateArticleBody): Promise<ArticleResponse>;
  abstract deleteArticle(id: string, organizationId: string): Promise<{ deleted: true }>;
  abstract createArticleMovement(body: CreateArticleMovementBody): Promise<StockMovementResponse>;
  abstract addInterventionArticleUsage(
    interventionId: string,
    body: AddInterventionArticleUsageBody,
  ): Promise<StockMovementResponse>;
  abstract listArticleMovements(
    organizationId: string,
    filters?: { articleId?: string; interventionId?: string; caseId?: string; limit?: number },
  ): Promise<StockMovementResponse[]>;
  abstract getInterventionUsage(
    organizationId: string,
    interventionId: string,
  ): Promise<InterventionArticleUsageResponse[]>;
}
