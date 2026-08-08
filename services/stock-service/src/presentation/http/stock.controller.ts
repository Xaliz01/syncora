import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { parsePaginationQueryParams } from "@planwise/shared";
import { parseOrganizationIdQuery } from "@planwise/shared/nest";
import { AbstractArticleStockService } from "../../domain/ports/article-stock.service.port";
import { AbstractPrestationService } from "../../domain/ports/prestation.service.port";
import { AbstractStockLocationService } from "../../domain/ports/stock-location.service.port";
import type {
  AddInterventionArticleUsageBody,
  CreateArticleBody,
  CreateArticleMovementBody,
  CreatePrestationBody,
  CreateStockLocationBody,
  CreateStockTransferBody,
  UpdateArticleBody,
  UpdatePrestationBody,
  UpdateStockLocationBody,
} from "@planwise/shared";

@Controller()
export class StockController {
  constructor(
    private readonly articleStockService: AbstractArticleStockService,
    private readonly prestationService: AbstractPrestationService,
    private readonly stockLocationService: AbstractStockLocationService,
  ) {}

  // ── Articles ──

  @Post("articles")
  async createArticle(@Body() body: CreateArticleBody) {
    return this.articleStockService.createArticle(body);
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
    return this.articleStockService.listArticles(organizationId, {
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
    return this.articleStockService.getArticle(id, organizationId);
  }

  @Patch("articles/:id")
  async updateArticle(@Param("id") id: string, @Body() body: UpdateArticleBody) {
    return this.articleStockService.updateArticle(id, body);
  }

  @Delete("articles/:id")
  async deleteArticle(@Param("id") id: string, @Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.articleStockService.deleteArticle(id, organizationId);
  }

  // ── Prestations ──

  @Post("prestations")
  async createPrestation(@Body() body: CreatePrestationBody) {
    return this.prestationService.createPrestation(body);
  }

  @Get("prestations")
  async listPrestations(
    @Query("organizationId") organizationId: string,
    @Query("search") search?: string,
    @Query("activeOnly") activeOnly?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    const pagination = parsePaginationQueryParams(limit, offset);
    return this.prestationService.listPrestations(organizationId, {
      search,
      activeOnly: activeOnly === undefined ? true : activeOnly === "true",
      ...pagination,
    });
  }

  @Get("prestations/:id")
  async getPrestation(@Param("id") id: string, @Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.prestationService.getPrestation(id, organizationId);
  }

  @Patch("prestations/:id")
  async updatePrestation(@Param("id") id: string, @Body() body: UpdatePrestationBody) {
    return this.prestationService.updatePrestation(id, body);
  }

  @Delete("prestations/:id")
  async deletePrestation(@Param("id") id: string, @Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.prestationService.deletePrestation(id, organizationId);
  }

  // ── Movements ──

  @Post("movements")
  async createArticleMovement(@Body() body: CreateArticleMovementBody) {
    return this.articleStockService.createArticleMovement(body);
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
    return this.articleStockService.listArticleMovements(organizationId, {
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
    return this.articleStockService.addInterventionArticleUsage(interventionId, body);
  }

  @Get("interventions/:interventionId/usage")
  async getInterventionUsage(
    @Param("interventionId") interventionId: string,
    @Query("organizationId") organizationId: string,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.articleStockService.getInterventionUsage(organizationId, interventionId);
  }

  // ── Stock locations ──

  @Post("locations")
  async createStockLocation(@Body() body: CreateStockLocationBody) {
    return this.stockLocationService.createStockLocation(body);
  }

  @Get("locations")
  async listStockLocations(@Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.stockLocationService.listStockLocations(organizationId);
  }

  @Get("locations/:id")
  async getStockLocation(@Param("id") id: string, @Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.stockLocationService.getStockLocation(id, organizationId);
  }

  @Patch("locations/:id")
  async updateStockLocation(@Param("id") id: string, @Body() body: UpdateStockLocationBody) {
    return this.stockLocationService.updateStockLocation(id, body);
  }

  @Delete("locations/:id")
  async deleteStockLocation(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.stockLocationService.deleteStockLocation(id, organizationId);
  }

  // ── Transfers ──

  @Post("transfers")
  async createStockTransfer(@Body() body: CreateStockTransferBody) {
    return this.articleStockService.createStockTransfer(body);
  }
}
