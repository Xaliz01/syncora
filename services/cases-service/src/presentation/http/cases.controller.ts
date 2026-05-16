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
import type {
  CreateCaseBody,
  CreateCaseTemplateBody,
  CreateInterventionBody,
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
    @Query("status") status?: string,
    @Query("unscheduled") unscheduled?: string,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.casesService.listInterventions(organizationId, {
      caseId,
      assigneeId,
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
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    if (!userId) throw new BadRequestException("userId query param is required");
    return this.casesService.getDashboard(organizationId, userId);
  }
}
