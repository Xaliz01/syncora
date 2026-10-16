import { Injectable } from "@nestjs/common";
import type {
  AddInterventionArticleUsageBody,
  AuthUser,
  CreateArticleBody,
  CreateArticleMovementBody,
  CreatePrestationBody,
  CreateStockLocationBody,
  CreateStockTransferBody,
  SetInterventionPrestationUsagesBody,
  UpdateArticleBody,
  UpdatePrestationBody,
  UpdateStockLocationBody,
} from "@planwise/shared";
import {
  AbstractStockGatewayService,
  type AddInterventionArticleUsageForOrgBody,
  type CreateArticleForOrgBody,
  type CreateArticleMovementForOrgBody,
  type CreatePrestationForOrgBody,
  type CreateStockLocationForOrgBody,
  type CreateStockTransferForOrgBody,
  type SetInterventionPrestationUsagesForOrgBody,
  type UpdateArticleForOrgBody,
  type UpdatePrestationForOrgBody,
  type UpdateStockLocationForOrgBody,
} from "./ports/stock.service.port";
import { AbstractArticleStockService } from "./stock/ports/article-stock.service.port";
import { AbstractPrestationService } from "./stock/ports/prestation.service.port";
import { AbstractStockLocationService } from "./stock/ports/stock-location.service.port";
import { AbstractInterventionPrestationUsageService } from "./stock/ports/intervention-prestation-usage.service.port";

@Injectable()
export class StockGatewayService extends AbstractStockGatewayService {
  constructor(
    private readonly articles: AbstractArticleStockService,
    private readonly prestations: AbstractPrestationService,
    private readonly locations: AbstractStockLocationService,
    private readonly prestationUsages: AbstractInterventionPrestationUsageService,
  ) {
    super();
  }

  async createArticle(user: AuthUser, body: CreateArticleForOrgBody) {
    return this.articles.createArticle({
      ...body,
      organizationId: user.organizationId,
    } as CreateArticleBody);
  }

  async listArticles(
    user: AuthUser,
    filters?: {
      search?: string;
      lowStockOnly?: boolean;
      activeOnly?: boolean;
      locationId?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    return this.articles.listArticles(user.organizationId, filters);
  }

  async getArticle(user: AuthUser, articleId: string) {
    return this.articles.getArticle(articleId, user.organizationId);
  }

  async updateArticle(user: AuthUser, articleId: string, body: UpdateArticleForOrgBody) {
    return this.articles.updateArticle(articleId, {
      ...body,
      organizationId: user.organizationId,
    } as UpdateArticleBody);
  }

  async deleteArticle(user: AuthUser, articleId: string) {
    return this.articles.deleteArticle(articleId, user.organizationId);
  }

  async createPrestation(user: AuthUser, body: CreatePrestationForOrgBody) {
    return this.prestations.createPrestation({
      ...body,
      organizationId: user.organizationId,
    } as CreatePrestationBody);
  }

  async listPrestations(
    user: AuthUser,
    filters?: {
      search?: string;
      activeOnly?: boolean;
      limit?: number;
      offset?: number;
    },
  ) {
    return this.prestations.listPrestations(user.organizationId, filters);
  }

  async getPrestation(user: AuthUser, prestationId: string) {
    return this.prestations.getPrestation(prestationId, user.organizationId);
  }

  async updatePrestation(user: AuthUser, prestationId: string, body: UpdatePrestationForOrgBody) {
    return this.prestations.updatePrestation(prestationId, {
      ...body,
      organizationId: user.organizationId,
    } as UpdatePrestationBody);
  }

  async deletePrestation(user: AuthUser, prestationId: string) {
    return this.prestations.deletePrestation(prestationId, user.organizationId);
  }

  async createArticleMovement(user: AuthUser, body: CreateArticleMovementForOrgBody) {
    return this.articles.createArticleMovement({
      actorUserId: user.id,
      actorUserName: user.name,
      ...body,
      organizationId: user.organizationId,
    } as CreateArticleMovementBody);
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
    return this.articles.listArticleMovements(user.organizationId, filters);
  }

  async addInterventionArticleUsage(
    user: AuthUser,
    interventionId: string,
    body: AddInterventionArticleUsageForOrgBody,
  ) {
    return this.articles.addInterventionArticleUsage(interventionId, {
      actorUserId: user.id,
      actorUserName: user.name,
      ...body,
      organizationId: user.organizationId,
    } as AddInterventionArticleUsageBody);
  }

  async getInterventionUsage(user: AuthUser, interventionId: string) {
    return this.articles.getInterventionUsage(user.organizationId, interventionId);
  }

  async listInterventionPrestationUsages(user: AuthUser, interventionId: string) {
    return this.prestationUsages.listByIntervention(user.organizationId, interventionId);
  }

  async setInterventionPrestationUsages(
    user: AuthUser,
    interventionId: string,
    body: SetInterventionPrestationUsagesForOrgBody,
  ) {
    return this.prestationUsages.replaceUsages(interventionId, {
      ...body,
      organizationId: user.organizationId,
    } as SetInterventionPrestationUsagesBody);
  }

  async listCaseInterventionPrestationUsages(user: AuthUser, caseId: string) {
    return this.prestationUsages.listByCase(user.organizationId, caseId);
  }

  async createStockLocation(user: AuthUser, body: CreateStockLocationForOrgBody) {
    return this.locations.createStockLocation({
      ...body,
      organizationId: user.organizationId,
    } as CreateStockLocationBody);
  }

  async listStockLocations(user: AuthUser) {
    return this.locations.listStockLocations(user.organizationId);
  }

  async getStockLocation(user: AuthUser, locationId: string) {
    return this.locations.getStockLocation(locationId, user.organizationId);
  }

  async updateStockLocation(
    user: AuthUser,
    locationId: string,
    body: UpdateStockLocationForOrgBody,
  ) {
    return this.locations.updateStockLocation(locationId, {
      ...body,
      organizationId: user.organizationId,
    } as UpdateStockLocationBody);
  }

  async deleteStockLocation(user: AuthUser, locationId: string) {
    return this.locations.deleteStockLocation(locationId, user.organizationId);
  }

  async createStockTransfer(user: AuthUser, body: CreateStockTransferForOrgBody) {
    return this.articles.createStockTransfer({
      actorUserId: user.id,
      actorUserName: user.name,
      ...body,
      organizationId: user.organizationId,
    } as CreateStockTransferBody);
  }
}
