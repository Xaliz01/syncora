import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  AddInterventionArticleUsageBody,
  ArticleResponse,
  AuthUser,
  CreateArticleBody,
  CreateArticleMovementBody,
  InterventionArticleUsageResponse,
  StockMovementResponse,
  UpdateArticleBody,
} from "@syncora/shared";
import {
  AbstractStockGatewayService,
  type AddInterventionArticleUsageForOrgBody,
  type CreateArticleForOrgBody,
  type UpdateArticleForOrgBody,
  type CreateArticleMovementForOrgBody,
} from "./ports/stock.service.port";

const STOCK_URL = process.env.STOCK_SERVICE_URL ?? "http://localhost:3007";

@Injectable()
export class StockGatewayService extends AbstractStockGatewayService {
  constructor(private readonly httpService: HttpService) {
    super();
  }

  async createArticle(user: AuthUser, body: CreateArticleForOrgBody) {
    return this.callStockService<ArticleResponse>({
      method: "post",
      path: "/articles",
      body: {
        organizationId: user.organizationId,
        ...body,
      } as CreateArticleBody,
    });
  }

  async listArticles(
    user: AuthUser,
    filters?: { search?: string; lowStockOnly?: boolean; activeOnly?: boolean },
  ) {
    return this.callStockService<ArticleResponse[]>({
      method: "get",
      path: "/articles",
      query: {
        organizationId: user.organizationId,
        ...filters,
      },
    });
  }

  async getArticle(user: AuthUser, articleId: string) {
    return this.callStockService<ArticleResponse>({
      method: "get",
      path: `/articles/${articleId}`,
      query: { organizationId: user.organizationId },
    });
  }

  async updateArticle(user: AuthUser, articleId: string, body: UpdateArticleForOrgBody) {
    return this.callStockService<ArticleResponse>({
      method: "patch",
      path: `/articles/${articleId}`,
      body: {
        organizationId: user.organizationId,
        ...body,
      } as UpdateArticleBody,
    });
  }

  async deleteArticle(user: AuthUser, articleId: string) {
    return this.callStockService<{ deleted: true }>({
      method: "delete",
      path: `/articles/${articleId}`,
      query: { organizationId: user.organizationId },
    });
  }

  async createArticleMovement(user: AuthUser, body: CreateArticleMovementForOrgBody) {
    return this.callStockService<StockMovementResponse>({
      method: "post",
      path: "/movements",
      body: {
        organizationId: user.organizationId,
        actorUserId: user.id,
        actorUserName: user.name,
        ...body,
      } as CreateArticleMovementBody,
    });
  }

  async listArticleMovements(
    user: AuthUser,
    filters?: { articleId?: string; interventionId?: string; caseId?: string; limit?: number },
  ) {
    return this.callStockService<StockMovementResponse[]>({
      method: "get",
      path: "/movements",
      query: {
        organizationId: user.organizationId,
        ...filters,
      },
    });
  }

  async addInterventionArticleUsage(
    user: AuthUser,
    interventionId: string,
    body: AddInterventionArticleUsageForOrgBody,
  ) {
    return this.callStockService<StockMovementResponse>({
      method: "post",
      path: `/interventions/${interventionId}/articles`,
      body: {
        organizationId: user.organizationId,
        actorUserId: user.id,
        actorUserName: user.name,
        ...body,
      } as AddInterventionArticleUsageBody,
    });
  }

  async getInterventionUsage(user: AuthUser, interventionId: string) {
    return this.callStockService<InterventionArticleUsageResponse[]>({
      method: "get",
      path: `/interventions/${interventionId}/usage`,
      query: { organizationId: user.organizationId },
    });
  }

  private async callStockService<T>(params: {
    method: "get" | "post" | "patch" | "put" | "delete";
    path: string;
    body?: unknown;
    query?: Record<string, unknown>;
  }): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.request<T>({
          method: params.method,
          url: `${STOCK_URL}${params.path}`,
          data: params.body,
          params: params.query,
        }),
      );
      return response.data;
    } catch (err: unknown) {
      this.rethrowAsHttpException(err);
    }
  }

  private rethrowAsHttpException(err: unknown): never {
    const status = (err as { response?: { status?: number } })?.response?.status;
    const message =
      (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message ??
      "Downstream service error";

    if (status === 400) throw new BadRequestException(message);
    if (status === 403) throw new ForbiddenException(message);
    if (status === 404) throw new NotFoundException(message);
    if (status === 409) throw new ConflictException(message);
    throw err;
  }
}
