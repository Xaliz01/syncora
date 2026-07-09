import { Injectable } from "@nestjs/common";
import type {
  AddInterventionArticleUsageBody,
  ArticleResponse,
  AuthUser,
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
import { OrganizationScopedHttpClient } from "../infrastructure/organization-scoped-http.client";
import {
  AbstractStockGatewayService,
  type AddInterventionArticleUsageForOrgBody,
  type CreateArticleForOrgBody,
  type CreateArticleMovementForOrgBody,
  type CreateStockLocationForOrgBody,
  type CreateStockTransferForOrgBody,
  type UpdateArticleForOrgBody,
  type UpdateStockLocationForOrgBody,
} from "./ports/stock.service.port";

const STOCK_URL = process.env.STOCK_SERVICE_URL ?? "http://localhost:3007";

@Injectable()
export class StockGatewayService extends AbstractStockGatewayService {
  constructor(private readonly scopedHttp: OrganizationScopedHttpClient) {
    super();
  }

  private request<T>(
    user: AuthUser,
    params: Omit<
      Parameters<OrganizationScopedHttpClient["request"]>[0],
      "baseUrl" | "organizationId" | "errorLabel"
    >,
  ) {
    return this.scopedHttp.request<T>({
      ...params,
      baseUrl: STOCK_URL,
      organizationId: user.organizationId,
      errorLabel: "Downstream service error",
    });
  }

  async createArticle(user: AuthUser, body: CreateArticleForOrgBody) {
    return this.request<ArticleResponse>(user, {
      method: "post",
      path: "/articles",
      body: { ...body } as CreateArticleBody,
    });
  }

  async listArticles(
    user: AuthUser,
    filters?: {
      search?: string;
      lowStockOnly?: boolean;
      activeOnly?: boolean;
      locationId?: string;
    },
  ) {
    return this.request<ArticleResponse[]>(user, {
      method: "get",
      path: "/articles",
      query: filters,
    });
  }

  async getArticle(user: AuthUser, articleId: string) {
    return this.request<ArticleResponse>(user, {
      method: "get",
      path: `/articles/${articleId}`,
    });
  }

  async updateArticle(user: AuthUser, articleId: string, body: UpdateArticleForOrgBody) {
    return this.request<ArticleResponse>(user, {
      method: "patch",
      path: `/articles/${articleId}`,
      body: { ...body } as UpdateArticleBody,
    });
  }

  async deleteArticle(user: AuthUser, articleId: string) {
    return this.request<{ deleted: true }>(user, {
      method: "delete",
      path: `/articles/${articleId}`,
      validateResponseScope: false,
    });
  }

  async createArticleMovement(user: AuthUser, body: CreateArticleMovementForOrgBody) {
    return this.request<StockMovementResponse>(user, {
      method: "post",
      path: "/movements",
      body: {
        actorUserId: user.id,
        actorUserName: user.name,
        ...body,
      } as CreateArticleMovementBody,
    });
  }

  async listArticleMovements(
    user: AuthUser,
    filters?: {
      articleId?: string;
      interventionId?: string;
      caseId?: string;
      locationId?: string;
      limit?: number;
    },
  ) {
    return this.request<StockMovementResponse[]>(user, {
      method: "get",
      path: "/movements",
      query: filters,
    });
  }

  async addInterventionArticleUsage(
    user: AuthUser,
    interventionId: string,
    body: AddInterventionArticleUsageForOrgBody,
  ) {
    return this.request<StockMovementResponse>(user, {
      method: "post",
      path: `/interventions/${interventionId}/articles`,
      body: {
        actorUserId: user.id,
        actorUserName: user.name,
        ...body,
      } as AddInterventionArticleUsageBody,
    });
  }

  async getInterventionUsage(user: AuthUser, interventionId: string) {
    return this.request<InterventionArticleUsageResponse[]>(user, {
      method: "get",
      path: `/interventions/${interventionId}/usage`,
    });
  }

  async createStockLocation(user: AuthUser, body: CreateStockLocationForOrgBody) {
    return this.request<StockLocationResponse>(user, {
      method: "post",
      path: "/locations",
      body: { ...body } as CreateStockLocationBody,
    });
  }

  async listStockLocations(user: AuthUser) {
    return this.request<StockLocationResponse[]>(user, {
      method: "get",
      path: "/locations",
    });
  }

  async getStockLocation(user: AuthUser, locationId: string) {
    return this.request<StockLocationResponse>(user, {
      method: "get",
      path: `/locations/${locationId}`,
    });
  }

  async updateStockLocation(
    user: AuthUser,
    locationId: string,
    body: UpdateStockLocationForOrgBody,
  ) {
    return this.request<StockLocationResponse>(user, {
      method: "patch",
      path: `/locations/${locationId}`,
      body: { ...body } as UpdateStockLocationBody,
    });
  }

  async deleteStockLocation(user: AuthUser, locationId: string) {
    return this.request<{ deleted: true }>(user, {
      method: "delete",
      path: `/locations/${locationId}`,
      validateResponseScope: false,
    });
  }

  async createStockTransfer(user: AuthUser, body: CreateStockTransferForOrgBody) {
    return this.request<StockMovementResponse>(user, {
      method: "post",
      path: "/transfers",
      body: {
        actorUserId: user.id,
        actorUserName: user.name,
        ...body,
      } as CreateStockTransferBody,
    });
  }
}
