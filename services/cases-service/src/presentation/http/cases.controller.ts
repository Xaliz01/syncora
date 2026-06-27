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
import { isDashboardStatFilter } from "@syncora/shared";
import type {
  CreateCaseBody,
  CreateCaseHistoryBody,
  CreateCaseTemplateBody,
  CompleteInterventionBody,
  CreateInterventionBody,
  SignInterventionBody,
  StartInterventionBody,
  UpdateCaseBody,
  UpdateCaseTemplateBody,
  UpdateInterventionBody,
  UpdateTodoBody,
} from "@syncora/shared";
import { parseOrganizationIdQuery } from "@syncora/shared/nest";

@Controller()
export class CasesController {
  constructor(private readonly casesService: AbstractCasesService) {}

  // ── Templates ──

  @Post("templates")
  async createTemplate(@Body() body: CreateCaseTemplateBody) {
    return this.casesService.createTemplate(body);
  }

  @Get("templates")
  async listTemplates(@Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.casesService.listTemplates(organizationId);
  }

  @Get("templates/:id")
  async getTemplate(@Param("id") id: string, @Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.casesService.getTemplate(id, organizationId);
  }

  @Patch("templates/:id")
  async updateTemplate(@Param("id") id: string, @Body() body: UpdateCaseTemplateBody) {
    return this.casesService.updateTemplate(id, body);
  }

  @Delete("templates/:id")
  async deleteTemplate(@Param("id") id: string, @Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
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
    @Query("search") search?: string,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.casesService.listCases(organizationId, {
      status,
      assigneeId,
      priority,
      search,
    });
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
    return this.casesService.addCaseHistory(body);
  }

  @Get("cases/:id/history")
  async listCaseHistory(@Param("id") id: string, @Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.casesService.listCaseHistory(id, organizationId);
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
    @Query("assignedTeamIds") assignedTeamIds?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("status") status?: string,
    @Query("unscheduled") unscheduled?: string,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.casesService.listInterventions(organizationId, {
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
      unscheduled: unscheduled === "true",
    });
  }

  @Get("interventions/:id")
  async getIntervention(@Param("id") id: string, @Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.casesService.getIntervention(id, organizationId);
  }

  @Patch("interventions/:id")
  async updateIntervention(@Param("id") id: string, @Body() body: UpdateInterventionBody) {
    return this.casesService.updateIntervention(id, body);
  }

  @Delete("interventions/:id")
  async deleteIntervention(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.casesService.deleteIntervention(id, organizationId);
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
    return this.casesService.getDashboard(organizationId, userId, userProfileId);
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
    return this.casesService.getDashboardTodoCases(
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
        "filter query param is required (assigned, in_progress, completed_week, overdue)",
      );
    }
    return this.casesService.getDashboardStatCases(organizationId, userId, userProfileId, filter);
  }

  @Post("interventions/:id/start")
  async startIntervention(@Param("id") id: string, @Body() body: StartInterventionBody) {
    return this.casesService.startIntervention(id, body);
  }

  @Post("interventions/:id/complete")
  async completeIntervention(@Param("id") id: string, @Body() body: CompleteInterventionBody) {
    return this.casesService.completeIntervention(id, body);
  }

  @Post("interventions/:id/sign")
  async signIntervention(@Param("id") id: string, @Body() body: SignInterventionBody) {
    return this.casesService.signIntervention(id, body);
  }

  @Get("interventions/:id/signature-image")
  async getSignatureImage(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    const result = await this.casesService.getInterventionWithSignature(id, organizationId);
    if (!result.signatureData) {
      throw new BadRequestException("No signature on this intervention");
    }
    return result;
  }
}
