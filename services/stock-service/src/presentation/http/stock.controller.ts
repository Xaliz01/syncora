import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { parseOrganizationIdQuery } from "@syncora/shared";
import { AbstractStockService } from "../../domain/ports/stock.service.port";
import type {
  AddInterventionArticleUsageBody,
  CreateArticleBody,
  CreateArticleMovementBody,
  UpdateArticleBody,
} from "@syncora/shared";

@Controller()
export class StockController {
  constructor(private readonly stockService: AbstractStockService) {}

  @Post("articles")
  async createArticle(@Body() body: CreateArticleBody) {
    return this.stockService.createArticle(body);
  }

  @Get("articles")
  async listArticles(
    @Query("organizationId") organizationId: string,
    @Query("search") search?: string,
    @Query("lowStockOnly") lowStockOnly?: string,
    @Query("activeOnly") activeOnly?: string,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.stockService.listArticles(organizationId, {
      search,
      lowStockOnly: lowStockOnly === "true",
      activeOnly: activeOnly === undefined ? true : activeOnly === "true",
    });
  }

  @Get("articles/:id")
  async getArticle(@Param("id") id: string, @Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.stockService.getArticle(id, organizationId);
  }

  @Patch("articles/:id")
  async updateArticle(@Param("id") id: string, @Body() body: UpdateArticleBody) {
    return this.stockService.updateArticle(id, body);
  }

  @Delete("articles/:id")
  async deleteArticle(@Param("id") id: string, @Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.stockService.deleteArticle(id, organizationId);
  }

  @Post("movements")
  async createArticleMovement(@Body() body: CreateArticleMovementBody) {
    return this.stockService.createArticleMovement(body);
  }

  @Get("movements")
  async listArticleMovements(
    @Query("organizationId") organizationId: string,
    @Query("articleId") articleId?: string,
    @Query("interventionId") interventionId?: string,
    @Query("caseId") caseId?: string,
    @Query("limit") limit?: string,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.stockService.listArticleMovements(organizationId, {
      articleId,
      interventionId,
      caseId,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post("interventions/:interventionId/articles")
  async addInterventionArticleUsage(
    @Param("interventionId") interventionId: string,
    @Body() body: AddInterventionArticleUsageBody,
  ) {
    return this.stockService.addInterventionArticleUsage(interventionId, body);
  }

  @Get("interventions/:interventionId/usage")
  async getInterventionUsage(
    @Param("interventionId") interventionId: string,
    @Query("organizationId") organizationId: string,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.stockService.getInterventionUsage(organizationId, interventionId);
  }
}
