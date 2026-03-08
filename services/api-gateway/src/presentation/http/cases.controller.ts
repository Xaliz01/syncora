import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards
} from "@nestjs/common";
import { CasesGatewayService } from "../../domain/cases.service";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import { RequirePermissionGuard, RequirePermissions } from "../../infrastructure/require-permission.guard";
import { CurrentUser } from "../../infrastructure/current-user.decorator";
import type { AuthUser } from "@syncora/shared";
import type {
  AddInterventionArticleUsageForOrgBody,
  CreateArticleForOrgBody,
  CreateArticleMovementForOrgBody,
  CreateCaseForOrgBody,
  CreateInterventionForOrgBody,
  CreateTemplateForOrgBody,
  UpdateArticleForOrgBody,
  UpdateCaseForOrgBody,
  UpdateInterventionForOrgBody,
  UpdateTemplateForOrgBody,
  UpdateTodoForOrgBody
} from "../../domain/cases.service";

@Controller("cases")
@UseGuards(JwtAuthGuard, RequirePermissionGuard)
export class CasesController {
  constructor(private readonly casesService: CasesGatewayService) {}

  // ── Templates ──

  @Post("templates")
  @RequirePermissions("case_templates.create")
  async createTemplate(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateTemplateForOrgBody
  ) {
    return this.casesService.createTemplate(user, body);
  }

  @Get("templates")
  @RequirePermissions("case_templates.read")
  async listTemplates(@CurrentUser() user: AuthUser) {
    return this.casesService.listTemplates(user);
  }

  @Get("templates/:templateId")
  @RequirePermissions("case_templates.read")
  async getTemplate(
    @CurrentUser() user: AuthUser,
    @Param("templateId") templateId: string
  ) {
    return this.casesService.getTemplate(user, templateId);
  }

  @Patch("templates/:templateId")
  @RequirePermissions("case_templates.update")
  async updateTemplate(
    @CurrentUser() user: AuthUser,
    @Param("templateId") templateId: string,
    @Body() body: UpdateTemplateForOrgBody
  ) {
    return this.casesService.updateTemplate(user, templateId, body);
  }

  @Delete("templates/:templateId")
  @RequirePermissions("case_templates.delete")
  async deleteTemplate(
    @CurrentUser() user: AuthUser,
    @Param("templateId") templateId: string
  ) {
    return this.casesService.deleteTemplate(user, templateId);
  }

  // ── Cases ──

  @Post("items")
  @RequirePermissions("cases.create")
  async createCase(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateCaseForOrgBody
  ) {
    return this.casesService.createCase(user, body);
  }

  @Get("items")
  @RequirePermissions("cases.read")
  async listCases(
    @CurrentUser() user: AuthUser,
    @Query("status") status?: string,
    @Query("assigneeId") assigneeId?: string,
    @Query("priority") priority?: string,
    @Query("search") search?: string
  ) {
    return this.casesService.listCases(user, { status, assigneeId, priority, search });
  }

  @Get("items/:caseId")
  @RequirePermissions("cases.read")
  async getCase(
    @CurrentUser() user: AuthUser,
    @Param("caseId") caseId: string
  ) {
    return this.casesService.getCase(user, caseId);
  }

  @Patch("items/:caseId")
  @RequirePermissions("cases.update")
  async updateCase(
    @CurrentUser() user: AuthUser,
    @Param("caseId") caseId: string,
    @Body() body: UpdateCaseForOrgBody
  ) {
    return this.casesService.updateCase(user, caseId, body);
  }

  @Delete("items/:caseId")
  @RequirePermissions("cases.delete")
  async deleteCase(
    @CurrentUser() user: AuthUser,
    @Param("caseId") caseId: string
  ) {
    return this.casesService.deleteCase(user, caseId);
  }

  @Put("items/:caseId/todos")
  @RequirePermissions("cases.update")
  async updateTodo(
    @CurrentUser() user: AuthUser,
    @Param("caseId") caseId: string,
    @Body() body: UpdateTodoForOrgBody
  ) {
    return this.casesService.updateTodo(user, caseId, body);
  }

  // ── Interventions ──

  @Post("interventions")
  @RequirePermissions("interventions.create")
  async createIntervention(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateInterventionForOrgBody
  ) {
    return this.casesService.createIntervention(user, body);
  }

  @Get("interventions")
  @RequirePermissions("interventions.read")
  async listInterventions(
    @CurrentUser() user: AuthUser,
    @Query("caseId") caseId?: string,
    @Query("assigneeId") assigneeId?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("status") status?: string
  ) {
    return this.casesService.listInterventions(user, {
      caseId,
      assigneeId,
      startDate,
      endDate,
      status
    });
  }

  @Get("interventions/:interventionId")
  @RequirePermissions("interventions.read")
  async getIntervention(
    @CurrentUser() user: AuthUser,
    @Param("interventionId") interventionId: string
  ) {
    return this.casesService.getIntervention(user, interventionId);
  }

  @Patch("interventions/:interventionId")
  @RequirePermissions("interventions.update")
  async updateIntervention(
    @CurrentUser() user: AuthUser,
    @Param("interventionId") interventionId: string,
    @Body() body: UpdateInterventionForOrgBody
  ) {
    return this.casesService.updateIntervention(user, interventionId, body);
  }

  @Post("interventions/:interventionId/articles")
  @RequirePermissions("interventions.update")
  async addInterventionArticleUsage(
    @CurrentUser() user: AuthUser,
    @Param("interventionId") interventionId: string,
    @Body() body: AddInterventionArticleUsageForOrgBody
  ) {
    return this.casesService.addInterventionArticleUsage(user, interventionId, body);
  }

  @Delete("interventions/:interventionId")
  @RequirePermissions("interventions.delete")
  async deleteIntervention(
    @CurrentUser() user: AuthUser,
    @Param("interventionId") interventionId: string
  ) {
    return this.casesService.deleteIntervention(user, interventionId);
  }

  // ── Articles / stock ──

  @Post("articles")
  @RequirePermissions("cases.update")
  async createArticle(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateArticleForOrgBody
  ) {
    return this.casesService.createArticle(user, body);
  }

  @Get("articles")
  @RequirePermissions("cases.read")
  async listArticles(
    @CurrentUser() user: AuthUser,
    @Query("search") search?: string,
    @Query("lowStockOnly") lowStockOnly?: string,
    @Query("activeOnly") activeOnly?: string
  ) {
    return this.casesService.listArticles(user, {
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
    return this.casesService.getArticle(user, articleId);
  }

  @Patch("articles/:articleId")
  @RequirePermissions("cases.update")
  async updateArticle(
    @CurrentUser() user: AuthUser,
    @Param("articleId") articleId: string,
    @Body() body: UpdateArticleForOrgBody
  ) {
    return this.casesService.updateArticle(user, articleId, body);
  }

  @Delete("articles/:articleId")
  @RequirePermissions("cases.update")
  async deleteArticle(
    @CurrentUser() user: AuthUser,
    @Param("articleId") articleId: string
  ) {
    return this.casesService.deleteArticle(user, articleId);
  }

  @Post("articles/movements")
  @RequirePermissions("cases.update")
  async createArticleMovement(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateArticleMovementForOrgBody
  ) {
    return this.casesService.createArticleMovement(user, body);
  }

  @Get("articles/movements/list")
  @RequirePermissions("cases.read")
  async listArticleMovements(
    @CurrentUser() user: AuthUser,
    @Query("articleId") articleId?: string,
    @Query("interventionId") interventionId?: string,
    @Query("limit") limit?: string
  ) {
    return this.casesService.listArticleMovements(user, {
      articleId,
      interventionId,
      limit: limit ? Number(limit) : undefined
    });
  }

  // ── Dashboard ──

  @Get("dashboard")
  @RequirePermissions("cases.read")
  async getDashboard(@CurrentUser() user: AuthUser) {
    return this.casesService.getDashboard(user);
  }
}
