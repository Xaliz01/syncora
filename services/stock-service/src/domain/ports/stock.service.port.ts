import type {
  AddInterventionArticleUsageBody,
  ArticleResponse,
  CreateArticleBody,
  CreateArticleMovementBody,
  CreateStockLocationBody,
  CreateStockTransferBody,
  InterventionArticleUsageResponse,
  StockLocationResponse,
  StockMovementResponse,
  UpdateArticleBody,
  UpdateStockLocationBody,
} from "@planwise/shared";

export abstract class AbstractStockService {
  abstract createArticle(body: CreateArticleBody): Promise<ArticleResponse>;
  abstract listArticles(
    organizationId: string,
    filters?: {
      search?: string;
      lowStockOnly?: boolean;
      activeOnly?: boolean;
      locationId?: string;
    },
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
    filters?: {
      articleId?: string;
      interventionId?: string;
      caseId?: string;
      locationId?: string;
      limit?: number;
    },
  ): Promise<StockMovementResponse[]>;
  abstract getInterventionUsage(
    organizationId: string,
    interventionId: string,
  ): Promise<InterventionArticleUsageResponse[]>;
  abstract createStockLocation(body: CreateStockLocationBody): Promise<StockLocationResponse>;
  abstract listStockLocations(organizationId: string): Promise<StockLocationResponse[]>;
  abstract getStockLocation(id: string, organizationId: string): Promise<StockLocationResponse>;
  abstract updateStockLocation(
    id: string,
    body: UpdateStockLocationBody,
  ): Promise<StockLocationResponse>;
  abstract deleteStockLocation(id: string, organizationId: string): Promise<{ deleted: true }>;
  abstract createStockTransfer(body: CreateStockTransferBody): Promise<StockMovementResponse>;
  abstract purgeTestData(organizationId: string): Promise<{ purged: true }>;
}
