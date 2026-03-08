import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import { RequirePermissionGuard, RequirePermissions } from "../../infrastructure/require-permission.guard";
import { CurrentUser } from "../../infrastructure/current-user.decorator";
import type { AuthUser } from "@syncora/shared";
import { StockGatewayService } from "../../domain/stock.service";
import type {
  AddInterventionArticleUsageForOrgBody,
  CreateArticleForOrgBody,
  CreateArticleMovementForOrgBody,
  UpdateArticleForOrgBody
} from "../../domain/stock.service";

@Controller("stock")
@UseGuards(JwtAuthGuard, RequirePermissionGuard)
export class StockController {
  constructor(private readonly stockService: StockGatewayService) {}

  @Post("articles")
  @RequirePermissions("cases.update")
  async createArticle(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateArticleForOrgBody
  ) {
    return this.stockService.createArticle(user, body);
  }

  @Get("articles")
  @RequirePermissions("cases.read")
  async listArticles(
    @CurrentUser() user: AuthUser,
    @Query("search") search?: string,
    @Query("lowStockOnly") lowStockOnly?: string,
    @Query("activeOnly") activeOnly?: string
  ) {
    return this.stockService.listArticles(user, {
      search,
      lowStockOnly: lowStockOnly === "true",
      activeOnly: activeOnly === undefined ? true : activeOnly === "true"
    });
  }

  @Get("articles/:articleId")
  @RequirePermissions("cases.read")
  async getArticle(
    @CurrentUser() user: AuthUser,
    @Param("articleId") articleId: string
  ) {
    return this.stockService.getArticle(user, articleId);
  }

  @Patch("articles/:articleId")
  @RequirePermissions("cases.update")
  async updateArticle(
    @CurrentUser() user: AuthUser,
    @Param("articleId") articleId: string,
    @Body() body: UpdateArticleForOrgBody
  ) {
    return this.stockService.updateArticle(user, articleId, body);
  }

  @Delete("articles/:articleId")
  @RequirePermissions("cases.update")
  async deleteArticle(
    @CurrentUser() user: AuthUser,
    @Param("articleId") articleId: string
  ) {
    return this.stockService.deleteArticle(user, articleId);
  }

  @Post("movements")
  @RequirePermissions("cases.update")
  async createArticleMovement(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateArticleMovementForOrgBody
  ) {
    return this.stockService.createArticleMovement(user, body);
  }

  @Get("movements")
  @RequirePermissions("cases.read")
  async listArticleMovements(
    @CurrentUser() user: AuthUser,
    @Query("articleId") articleId?: string,
    @Query("interventionId") interventionId?: string,
    @Query("caseId") caseId?: string,
    @Query("limit") limit?: string
  ) {
    return this.stockService.listArticleMovements(user, {
      articleId,
      interventionId,
      caseId,
      limit: limit ? Number(limit) : undefined
    });
  }

  @Post("interventions/:interventionId/articles")
  @RequirePermissions("interventions.update")
  async addInterventionArticleUsage(
    @CurrentUser() user: AuthUser,
    @Param("interventionId") interventionId: string,
    @Body() body: AddInterventionArticleUsageForOrgBody
  ) {
    return this.stockService.addInterventionArticleUsage(user, interventionId, body);
  }

  @Get("interventions/:interventionId/usage")
  @RequirePermissions("interventions.read")
  async getInterventionUsage(
    @CurrentUser() user: AuthUser,
    @Param("interventionId") interventionId: string
  ) {
    return this.stockService.getInterventionUsage(user, interventionId);
  }
}
