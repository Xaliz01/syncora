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
import type { AuthUser } from "@syncora/shared";
import { AbstractStockGatewayService } from "../../domain/ports/stock.service.port";
import type {
  AddInterventionArticleUsageForOrgBody,
  CreateArticleForOrgBody,
  CreateArticleMovementForOrgBody,
  UpdateArticleForOrgBody,
} from "../../domain/ports/stock.service.port";

@Controller("stock")
@UseGuards(JwtAuthGuard, SubscriptionAccessGuard, RequirePermissionGuard)
export class StockController {
  constructor(private readonly stockService: AbstractStockGatewayService) {}

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
  ) {
    return this.stockService.listArticles(user, {
      search,
      lowStockOnly: lowStockOnly === "true",
      activeOnly: activeOnly === undefined ? true : activeOnly === "true",
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
    @Query("limit") limit?: string,
  ) {
    return this.stockService.listArticleMovements(user, {
      articleId,
      interventionId,
      caseId,
      limit: limit ? Number(limit) : undefined,
    });
  }

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
}
