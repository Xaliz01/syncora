import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import {
  RequirePermissionGuard,
  RequirePermissions,
} from "../../infrastructure/require-permission.guard";
import { SubscriptionAccessGuard } from "../../infrastructure/subscription-access.guard";
import { CurrentUser } from "../../infrastructure/current-user.decorator";
import { NotifyEntity } from "../../infrastructure/notify-entity.decorator";
import type { AuthUser } from "@planwise/shared";
import { AbstractStockGatewayService } from "../../domain/ports/stock.service.port";
import type {
  AddInterventionArticleUsageForOrgBody,
  CreateArticleForOrgBody,
  CreateArticleMovementForOrgBody,
  CreateStockLocationForOrgBody,
  CreateStockTransferForOrgBody,
  UpdateArticleForOrgBody,
  UpdateStockLocationForOrgBody,
} from "../../domain/ports/stock.service.port";

@Controller("stock")
@UseGuards(JwtAuthGuard, SubscriptionAccessGuard, RequirePermissionGuard)
export class StockController {
  constructor(private readonly stockService: AbstractStockGatewayService) {}

  // ── Articles ──

  @Post("articles")
  @RequirePermissions("stock.articles.create")
  @NotifyEntity({ type: "article", labelField: "name" })
  async createArticle(@CurrentUser() user: AuthUser, @Body() body: CreateArticleForOrgBody) {
    return this.stockService.createArticle(user, body);
  }

  @Get("articles")
  @RequirePermissions("stock.articles.read")
  async listArticles(
    @CurrentUser() user: AuthUser,
    @Query("search") search?: string,
    @Query("lowStockOnly") lowStockOnly?: string,
    @Query("activeOnly") activeOnly?: string,
    @Query("locationId") locationId?: string,
  ) {
    return this.stockService.listArticles(user, {
      search,
      lowStockOnly: lowStockOnly === "true",
      activeOnly: activeOnly === undefined ? true : activeOnly === "true",
      locationId,
    });
  }

  @Get("articles/:articleId")
  @RequirePermissions("stock.articles.read")
  async getArticle(@CurrentUser() user: AuthUser, @Param("articleId") articleId: string) {
    return this.stockService.getArticle(user, articleId);
  }

  @Patch("articles/:articleId")
  @RequirePermissions("stock.articles.update")
  @NotifyEntity({ type: "article", labelField: "name" })
  async updateArticle(
    @CurrentUser() user: AuthUser,
    @Param("articleId") articleId: string,
    @Body() body: UpdateArticleForOrgBody,
  ) {
    return this.stockService.updateArticle(user, articleId, body);
  }

  @Delete("articles/:articleId")
  @RequirePermissions("stock.articles.delete")
  @NotifyEntity({ type: "article", idParam: "articleId" })
  async deleteArticle(@CurrentUser() user: AuthUser, @Param("articleId") articleId: string) {
    return this.stockService.deleteArticle(user, articleId);
  }

  // ── Movements ──

  @Post("movements")
  @RequirePermissions("stock.movements.create")
  @NotifyEntity({ type: "stock_movement", labelField: "articleName" })
  async createArticleMovement(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateArticleMovementForOrgBody,
  ) {
    return this.stockService.createArticleMovement(user, body);
  }

  @Get("movements")
  @RequirePermissions("stock.movements.read")
  async listArticleMovements(
    @CurrentUser() user: AuthUser,
    @Query("articleId") articleId?: string,
    @Query("interventionId") interventionId?: string,
    @Query("caseId") caseId?: string,
    @Query("locationId") locationId?: string,
    @Query("limit") limit?: string,
  ) {
    return this.stockService.listArticleMovements(user, {
      articleId,
      interventionId,
      caseId,
      locationId,
      limit: limit ? Number(limit) : undefined,
    });
  }

  // ── Intervention usage ──

  @Post("interventions/:interventionId/articles")
  @RequirePermissions("stock.interventions.create")
  @NotifyEntity({ type: "stock_movement", labelField: "articleName" })
  async addInterventionArticleUsage(
    @CurrentUser() user: AuthUser,
    @Param("interventionId") interventionId: string,
    @Body() body: AddInterventionArticleUsageForOrgBody,
  ) {
    return this.stockService.addInterventionArticleUsage(user, interventionId, body);
  }

  @Get("interventions/:interventionId/usage")
  @RequirePermissions("stock.interventions.read")
  async getInterventionUsage(
    @CurrentUser() user: AuthUser,
    @Param("interventionId") interventionId: string,
  ) {
    return this.stockService.getInterventionUsage(user, interventionId);
  }

  // ── Stock locations ──

  @Post("locations")
  @RequirePermissions("stock.locations.create")
  @NotifyEntity({ type: "stock_location", labelField: "name" })
  async createStockLocation(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateStockLocationForOrgBody,
  ) {
    return this.stockService.createStockLocation(user, body);
  }

  @Get("locations")
  @RequirePermissions("stock.locations.read")
  async listStockLocations(@CurrentUser() user: AuthUser) {
    return this.stockService.listStockLocations(user);
  }

  @Get("locations/:locationId")
  @RequirePermissions("stock.locations.read")
  async getStockLocation(@CurrentUser() user: AuthUser, @Param("locationId") locationId: string) {
    return this.stockService.getStockLocation(user, locationId);
  }

  @Patch("locations/:locationId")
  @RequirePermissions("stock.locations.update")
  @NotifyEntity({ type: "stock_location", labelField: "name" })
  async updateStockLocation(
    @CurrentUser() user: AuthUser,
    @Param("locationId") locationId: string,
    @Body() body: UpdateStockLocationForOrgBody,
  ) {
    return this.stockService.updateStockLocation(user, locationId, body);
  }

  @Delete("locations/:locationId")
  @RequirePermissions("stock.locations.delete")
  @NotifyEntity({ type: "stock_location", idParam: "locationId" })
  async deleteStockLocation(
    @CurrentUser() user: AuthUser,
    @Param("locationId") locationId: string,
  ) {
    return this.stockService.deleteStockLocation(user, locationId);
  }

  // ── Transfers ──

  @Post("transfers")
  @RequirePermissions("stock.transfers.create")
  @NotifyEntity({ type: "stock_transfer", labelField: "articleName" })
  async createStockTransfer(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateStockTransferForOrgBody,
  ) {
    return this.stockService.createStockTransfer(user, body);
  }
}
