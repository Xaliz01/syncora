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
  Query,
} from "@nestjs/common";
import { AbstractCasesService } from "../../domain/ports/cases.service.port";
import { AbstractInterventionsService } from "../../domain/ports/interventions.service.port";
import { AbstractQuotesService } from "../../domain/ports/quotes.service.port";
import { AbstractCommentsService } from "../../domain/ports/comments.service.port";
import { AbstractCaseHistoryService } from "../../domain/ports/case-history.service.port";
import { AbstractDashboardService } from "../../domain/ports/dashboard.service.port";
import { AbstractCaseTemplatesService } from "../../domain/ports/case-templates.service.port";
import { AbstractInterventionTypesService } from "../../domain/ports/intervention-types.service.port";
import {
  isDashboardStatFilter,
  MAX_PAGE_LIMIT_WIDE,
  parsePaginationQueryParams,
  type CreateCaseBody,
  type CreateCaseHistoryBody,
  type CreateCaseTemplateBody,
  type CreateInterventionTypeBody,
  type CompleteInterventionBody,
  type CreateInterventionBody,
  type CreateQuoteBody,
  type SignInterventionBody,
  type StartInterventionBody,
  type UpdateCaseBody,
  type UpdateCaseTemplateBody,
  type UpdateInterventionTypeBody,
  type UpdateInterventionBody,
  type UpdateQuoteBody,
  type UpdateTodoBody,
  type CreateCommentBody,
  type UpdateCommentBody,
  type CommentEntityType,
} from "@planwise/shared";
import { parseOrganizationIdQuery } from "@planwise/shared/nest";

@Controller()
export class CasesController {
  constructor(
    private readonly casesService: AbstractCasesService,
    private readonly interventionsService: AbstractInterventionsService,
    private readonly quotesService: AbstractQuotesService,
    private readonly commentsService: AbstractCommentsService,
    private readonly caseHistoryService: AbstractCaseHistoryService,
    private readonly dashboardService: AbstractDashboardService,
    private readonly caseTemplatesService: AbstractCaseTemplatesService,
    private readonly interventionTypesService: AbstractInterventionTypesService,
  ) {}

  // ── Templates ──

  @Post("templates")
  async createTemplate(@Body() body: CreateCaseTemplateBody) {
    return this.caseTemplatesService.createTemplate(body);
  }

  @Get("templates")
  async listTemplates(@Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.caseTemplatesService.listTemplates(organizationId);
  }

  @Get("templates/:id")
  async getTemplate(@Param("id") id: string, @Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.caseTemplatesService.getTemplate(id, organizationId);
  }

  @Patch("templates/:id")
  async updateTemplate(@Param("id") id: string, @Body() body: UpdateCaseTemplateBody) {
    return this.caseTemplatesService.updateTemplate(id, body);
  }

  @Delete("templates/:id")
  async deleteTemplate(@Param("id") id: string, @Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.caseTemplatesService.deleteTemplate(id, organizationId);
  }

  // ── Intervention types ──

  @Post("intervention-types")
  async createInterventionType(@Body() body: CreateInterventionTypeBody) {
    return this.interventionTypesService.create(body);
  }

  @Get("intervention-types")
  async listInterventionTypes(@Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.interventionTypesService.list(organizationId);
  }

  @Get("intervention-types/:id")
  async getInterventionType(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.interventionTypesService.getById(id, organizationId);
  }

  @Patch("intervention-types/:id")
  async updateInterventionType(@Param("id") id: string, @Body() body: UpdateInterventionTypeBody) {
    return this.interventionTypesService.update(id, body);
  }

  @Delete("intervention-types/:id")
  async deleteInterventionType(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.interventionTypesService.remove(id, organizationId);
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
    @Query("billingStatus") billingStatus?: string,
    @Query("assigneeId") assigneeId?: string,
    @Query("priority") priority?: string,
    @Query("search") search?: string,
    @Query("customerId") customerId?: string,
    @Query("orderGiverId") orderGiverId?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    const pagination = parsePaginationQueryParams(limit, offset);
    return this.casesService.listCases(organizationId, {
      status,
      billingStatus,
      assigneeId,
      priority,
      search,
      customerId,
      orderGiverId,
      ...pagination,
    });
  }

  @Get("cases/ids")
  async listCaseIds(
    @Query("organizationId") organizationId: string,
    @Query("customerId") customerId?: string,
    @Query("orderGiverId") orderGiverId?: string,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    const ids = await this.casesService.listCaseIds(organizationId, {
      customerId,
      orderGiverId,
    });
    return { ids };
  }

  @Get("cases/:id")
  async getCase(@Param("id") id: string, @Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.casesService.getCase(id, organizationId);
  }

  @Patch("cases/:id")
  async updateCase(@Param("id") id: string, @Body() body: UpdateCaseBody) {
    return this.casesService.updateCase(id, body);
  }

  @Delete("cases/:id")
  async deleteCase(@Param("id") id: string, @Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.casesService.deleteCase(id, organizationId);
  }

  @Put("cases/:id/todos")
  async updateTodo(@Param("id") id: string, @Body() body: UpdateTodoBody) {
    return this.casesService.updateTodo(id, body);
  }

  // ── History ──

  @Post("cases/:id/history")
  async addCaseHistory(@Body() body: CreateCaseHistoryBody) {
    return this.caseHistoryService.addCaseHistory(body);
  }

  @Get("cases/:id/history")
  async listCaseHistory(@Param("id") id: string, @Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.caseHistoryService.listCaseHistory(id, organizationId);
  }

  // ── Comments ──

  @Post("comments")
  async createComment(@Body() body: CreateCommentBody) {
    return this.commentsService.createComment(body);
  }

  @Get("comments")
  async listComments(
    @Query("organizationId") organizationId: string,
    @Query("entityType") entityType: string,
    @Query("entityId") entityId: string,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    if (!entityType || !entityId) {
      throw new BadRequestException("entityType and entityId query params are required");
    }
    return this.commentsService.listComments(
      organizationId,
      entityType as CommentEntityType,
      entityId,
    );
  }

  @Get("comments/:id")
  async getComment(@Param("id") id: string, @Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.commentsService.getComment(id, organizationId);
  }

  @Patch("comments/:id")
  async updateComment(@Param("id") id: string, @Body() body: UpdateCommentBody) {
    return this.commentsService.updateComment(id, body);
  }

  @Delete("comments/:id")
  async deleteComment(@Param("id") id: string, @Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.commentsService.deleteComment(id, organizationId);
  }

  // ── Interventions ──

  @Post("interventions")
  async createIntervention(@Body() body: CreateInterventionBody) {
    return this.interventionsService.createIntervention(body);
  }

  @Get("interventions")
  async listInterventions(
    @Query("organizationId") organizationId: string,
    @Query("caseId") caseId?: string,
    @Query("assigneeId") assigneeId?: string,
    @Query("assignedTeamIds") assignedTeamIds?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("status") status?: string,
    @Query("typeId") typeId?: string,
    @Query("unscheduled") unscheduled?: string,
    @Query("search") search?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    const dateBounded = Boolean(startDate || endDate);
    const pagination = parsePaginationQueryParams(limit, offset, {
      maxLimit: dateBounded ? MAX_PAGE_LIMIT_WIDE : undefined,
    });
    return this.interventionsService.listInterventions(organizationId, {
      caseId,
      assigneeId,
      assignedTeamIds: assignedTeamIds
        ? assignedTeamIds
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean)
        : undefined,
      startDate,
      endDate,
      status,
      typeId,
      unscheduled: unscheduled === "true",
      search,
      ...pagination,
    });
  }

  @Get("interventions/:id")
  async getIntervention(@Param("id") id: string, @Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.interventionsService.getIntervention(id, organizationId);
  }

  @Patch("interventions/:id")
  async updateIntervention(@Param("id") id: string, @Body() body: UpdateInterventionBody) {
    return this.interventionsService.updateIntervention(id, body);
  }

  @Delete("interventions/:id")
  async deleteIntervention(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.interventionsService.deleteIntervention(id, organizationId);
  }

  // ── Quotes ──

  @Post("quotes")
  async createQuote(@Body() body: CreateQuoteBody) {
    return this.quotesService.createQuote(body);
  }

  @Get("quotes")
  async listQuotes(
    @Query("organizationId") organizationId: string,
    @Query("caseId") caseId?: string,
    @Query("status") status?: string,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.quotesService.listQuotes(organizationId, { caseId, status });
  }

  @Get("quotes/:id")
  async getQuote(@Param("id") id: string, @Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.quotesService.getQuote(id, organizationId);
  }

  @Patch("quotes/:id")
  async updateQuote(@Param("id") id: string, @Body() body: UpdateQuoteBody) {
    return this.quotesService.updateQuote(id, body);
  }

  @Delete("quotes/:id")
  async deleteQuote(@Param("id") id: string, @Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.quotesService.deleteQuote(id, organizationId);
  }

  // ── Dashboard ──

  @Get("dashboard")
  async getDashboard(
    @Query("organizationId") organizationId: string,
    @Query("userId") userId: string,
    @Query("userProfileId") userProfileId?: string,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    if (!userId) throw new BadRequestException("userId query param is required");
    return this.dashboardService.getDashboard(organizationId, userId, userProfileId);
  }

  @Get("dashboard/todo-cases")
  async getDashboardTodoCases(
    @Query("organizationId") organizationId: string,
    @Query("userId") userId: string,
    @Query("userProfileId") userProfileId: string | undefined,
    @Query("templateId") templateId: string,
    @Query("todoLabel") todoLabel: string,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    if (!userId) throw new BadRequestException("userId query param is required");
    if (!templateId) throw new BadRequestException("templateId query param is required");
    if (!todoLabel) throw new BadRequestException("todoLabel query param is required");
    return this.dashboardService.getDashboardTodoCases(
      organizationId,
      userId,
      userProfileId,
      templateId,
      todoLabel,
    );
  }

  @Get("dashboard/stat-cases")
  async getDashboardStatCases(
    @Query("organizationId") organizationId: string,
    @Query("userId") userId: string,
    @Query("userProfileId") userProfileId: string | undefined,
    @Query("filter") filter: string,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    if (!userId) throw new BadRequestException("userId query param is required");
    if (!filter || !isDashboardStatFilter(filter)) {
      throw new BadRequestException(
        "filter query param is required (assigned, in_progress, completed_week, overdue, to_invoice)",
      );
    }
    return this.dashboardService.getDashboardStatCases(
      organizationId,
      userId,
      userProfileId,
      filter,
    );
  }

  @Get("cases/interventions/upcoming")
  async listUpcomingInterventions(@Query("from") from: string, @Query("to") to: string) {
    if (!from || !to) {
      throw new BadRequestException("from and to query params are required");
    }
    return this.interventionsService.listUpcomingInterventions(from, to);
  }

  @Post("interventions/:id/start")
  async startIntervention(@Param("id") id: string, @Body() body: StartInterventionBody) {
    return this.interventionsService.startIntervention(id, body);
  }

  @Post("interventions/:id/complete")
  async completeIntervention(@Param("id") id: string, @Body() body: CompleteInterventionBody) {
    return this.interventionsService.completeIntervention(id, body);
  }

  @Post("interventions/:id/sign")
  async signIntervention(@Param("id") id: string, @Body() body: SignInterventionBody) {
    return this.interventionsService.signIntervention(id, body);
  }

  @Get("interventions/:id/signature-image")
  async getSignatureImage(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    const result = await this.interventionsService.getInterventionWithSignature(id, organizationId);
    if (!result.signatureData) {
      throw new BadRequestException("No signature on this intervention");
    }
    return result;
  }
}
