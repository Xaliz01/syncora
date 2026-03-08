import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query
} from "@nestjs/common";
import { CasesService } from "../../domain/cases.service";
import type {
  AddInterventionArticleUsageBody,
  CreateArticleBody,
  CreateArticleMovementBody,
  CreateCaseBody,
  CreateCaseTemplateBody,
  CreateInterventionBody,
  UpdateArticleBody,
  UpdateCaseBody,
  UpdateCaseTemplateBody,
  UpdateInterventionBody,
  UpdateTodoBody
} from "@syncora/shared";

@Controller()
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  // ── Templates ──

  @Post("templates")
  async createTemplate(@Body() body: CreateCaseTemplateBody) {
    return this.casesService.createTemplate(body);
  }

  @Get("templates")
  async listTemplates(@Query("organizationId") organizationId: string) {
    this.ensureOrganizationId(organizationId);
    return this.casesService.listTemplates(organizationId);
  }

  @Get("templates/:id")
  async getTemplate(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string
  ) {
    this.ensureOrganizationId(organizationId);
    return this.casesService.getTemplate(id, organizationId);
  }

  @Patch("templates/:id")
  async updateTemplate(@Param("id") id: string, @Body() body: UpdateCaseTemplateBody) {
    return this.casesService.updateTemplate(id, body);
  }

  @Delete("templates/:id")
  async deleteTemplate(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string
  ) {
    this.ensureOrganizationId(organizationId);
    return this.casesService.deleteTemplate(id, organizationId);
  }

  // ── Cases ──

  @Post("cases")
  async createCase(@Body() body: CreateCaseBody) {
    return this.casesService.createCase(body);
  }

  @Get("cases")
  async listCases(
    @Query("organizationId") organizationId: string,
    @Query("status") status?: string,
    @Query("assigneeId") assigneeId?: string,
    @Query("priority") priority?: string,
    @Query("search") search?: string
  ) {
    this.ensureOrganizationId(organizationId);
    return this.casesService.listCases(organizationId, {
      status,
      assigneeId,
      priority,
      search
    });
  }

  @Get("cases/:id")
  async getCase(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string
  ) {
    this.ensureOrganizationId(organizationId);
    return this.casesService.getCase(id, organizationId);
  }

  @Patch("cases/:id")
  async updateCase(@Param("id") id: string, @Body() body: UpdateCaseBody) {
    return this.casesService.updateCase(id, body);
  }

  @Delete("cases/:id")
  async deleteCase(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string
  ) {
    this.ensureOrganizationId(organizationId);
    return this.casesService.deleteCase(id, organizationId);
  }

  @Put("cases/:id/todos")
  async updateTodo(@Param("id") id: string, @Body() body: UpdateTodoBody) {
    return this.casesService.updateTodo(id, body);
  }

  // ── Interventions ──

  @Post("interventions")
  async createIntervention(@Body() body: CreateInterventionBody) {
    return this.casesService.createIntervention(body);
  }

  @Get("interventions")
  async listInterventions(
    @Query("organizationId") organizationId: string,
    @Query("caseId") caseId?: string,
    @Query("assigneeId") assigneeId?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("status") status?: string
  ) {
    this.ensureOrganizationId(organizationId);
    return this.casesService.listInterventions(organizationId, {
      caseId,
      assigneeId,
      startDate,
      endDate,
      status
    });
  }

  @Get("interventions/:id")
  async getIntervention(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string
  ) {
    this.ensureOrganizationId(organizationId);
    return this.casesService.getIntervention(id, organizationId);
  }

  @Patch("interventions/:id")
  async updateIntervention(@Param("id") id: string, @Body() body: UpdateInterventionBody) {
    return this.casesService.updateIntervention(id, body);
  }

  @Post("interventions/:id/articles")
  async addInterventionArticleUsage(
    @Param("id") id: string,
    @Body() body: AddInterventionArticleUsageBody
  ) {
    return this.casesService.addInterventionArticleUsage(id, body);
  }

  @Delete("interventions/:id")
  async deleteIntervention(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string
  ) {
    this.ensureOrganizationId(organizationId);
    return this.casesService.deleteIntervention(id, organizationId);
  }

  // ── Dashboard ──

  @Get("dashboard")
  async getDashboard(
    @Query("organizationId") organizationId: string,
    @Query("userId") userId: string
  ) {
    this.ensureOrganizationId(organizationId);
    if (!userId) throw new BadRequestException("userId query param is required");
    return this.casesService.getDashboard(organizationId, userId);
  }

  // ── Articles / Stock ──

  @Post("articles")
  async createArticle(@Body() body: CreateArticleBody) {
    return this.casesService.createArticle(body);
  }

  @Get("articles")
  async listArticles(
    @Query("organizationId") organizationId: string,
    @Query("search") search?: string,
    @Query("lowStockOnly") lowStockOnly?: string,
    @Query("activeOnly") activeOnly?: string
  ) {
    this.ensureOrganizationId(organizationId);
    return this.casesService.listArticles(organizationId, {
      search,
      lowStockOnly: lowStockOnly === "true",
      activeOnly: activeOnly === undefined ? true : activeOnly === "true"
    });
  }

  @Get("articles/:id")
  async getArticle(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string
  ) {
    this.ensureOrganizationId(organizationId);
    return this.casesService.getArticle(id, organizationId);
  }

  @Patch("articles/:id")
  async updateArticle(@Param("id") id: string, @Body() body: UpdateArticleBody) {
    return this.casesService.updateArticle(id, body);
  }

  @Delete("articles/:id")
  async deleteArticle(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string
  ) {
    this.ensureOrganizationId(organizationId);
    return this.casesService.deleteArticle(id, organizationId);
  }

  @Post("articles/movements")
  async createArticleMovement(@Body() body: CreateArticleMovementBody) {
    return this.casesService.createArticleMovement(body);
  }

  @Get("articles/movements/list")
  async listArticleMovements(
    @Query("organizationId") organizationId: string,
    @Query("articleId") articleId?: string,
    @Query("interventionId") interventionId?: string,
    @Query("limit") limit?: string
  ) {
    this.ensureOrganizationId(organizationId);
    return this.casesService.listArticleMovements(organizationId, {
      articleId,
      interventionId,
      limit: limit ? Number(limit) : undefined
    });
  }

  private ensureOrganizationId(organizationId: string): void {
    if (!organizationId) {
      throw new BadRequestException("organizationId query param is required");
    }
  }
}
