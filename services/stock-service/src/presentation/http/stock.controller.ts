import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { parsePaginationQueryParams } from "@planwise/shared";
import { parseOrganizationIdQuery } from "@planwise/shared/nest";
import { AbstractStockService } from "../../domain/ports/stock.service.port";
import type {
  AddInterventionArticleUsageBody,
  CreateArticleBody,
  CreateArticleMovementBody,
  CreateStockLocationBody,
  CreateStockTransferBody,
  UpdateArticleBody,
  UpdateStockLocationBody,
} from "@planwise/shared";

@Controller()
export class StockController {
  constructor(private readonly stockService: AbstractStockService) {}

  // ── Articles ──

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
    @Query("locationId") locationId?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    const pagination = parsePaginationQueryParams(limit, offset);
    return this.stockService.listArticles(organizationId, {
      search,
      lowStockOnly: lowStockOnly === "true",
      activeOnly: activeOnly === undefined ? true : activeOnly === "true",
      locationId,
      ...pagination,
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

  // ── Movements ──

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
    @Query("locationId") locationId?: string,
    @Query("limit") limit?: string,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.stockService.listArticleMovements(organizationId, {
      articleId,
      interventionId,
      caseId,
      locationId,
      limit: limit ? Number(limit) : undefined,
    });
  }

  // ── Intervention usage ──

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

  // ── Stock locations ──

  @Post("locations")
  async createStockLocation(@Body() body: CreateStockLocationBody) {
    return this.stockService.createStockLocation(body);
  }

  @Get("locations")
  async listStockLocations(@Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.stockService.listStockLocations(organizationId);
  }

  @Get("locations/:id")
  async getStockLocation(@Param("id") id: string, @Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.stockService.getStockLocation(id, organizationId);
  }

  @Patch("locations/:id")
  async updateStockLocation(@Param("id") id: string, @Body() body: UpdateStockLocationBody) {
    return this.stockService.updateStockLocation(id, body);
  }

  @Delete("locations/:id")
  async deleteStockLocation(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.stockService.deleteStockLocation(id, organizationId);
  }

  // ── Transfers ──

  @Post("transfers")
  async createStockTransfer(@Body() body: CreateStockTransferBody) {
    return this.stockService.createStockTransfer(body);
  }
}
