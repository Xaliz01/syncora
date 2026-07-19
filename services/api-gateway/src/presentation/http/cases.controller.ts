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
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { isDashboardStatFilter } from "@planwise/shared";
import { AbstractCasesGatewayService } from "../../domain/ports/cases.service.port";
import type {
  CreateCaseForOrgBody,
  CreateQuoteForOrgBody,
  CompleteInterventionForOrgBody,
  CreateInterventionForOrgBody,
  CreateTemplateForOrgBody,
  SignInterventionForOrgBody,
  UpdateCaseForOrgBody,
  UpdateQuoteForOrgBody,
  StartInterventionForOrgBody,
  UpdateInterventionForOrgBody,
  UpdateTemplateForOrgBody,
  UpdateTodoForOrgBody,
} from "../../domain/ports/cases.service.port";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import {
  RequirePermissionGuard,
  RequirePermissions,
} from "../../infrastructure/require-permission.guard";
import { SubscriptionAccessGuard } from "../../infrastructure/subscription-access.guard";
import { CurrentUser } from "../../infrastructure/current-user.decorator";
import { NotifyEntity } from "../../infrastructure/notify-entity.decorator";
import type { AuthUser } from "@planwise/shared";

@Controller("cases")
@UseGuards(JwtAuthGuard, SubscriptionAccessGuard, RequirePermissionGuard)
export class CasesController {
  constructor(private readonly casesService: AbstractCasesGatewayService) {}

  @Post("templates")
  @RequirePermissions("case_templates.create")
  @NotifyEntity({ type: "case_template", labelField: "name" })
  async createTemplate(@CurrentUser() user: AuthUser, @Body() body: CreateTemplateForOrgBody) {
    return this.casesService.createTemplate(user, body);
  }

  @Get("templates")
  @RequirePermissions("case_templates.read")
  async listTemplates(@CurrentUser() user: AuthUser) {
    return this.casesService.listTemplates(user);
  }

  @Get("templates/:templateId")
  @RequirePermissions("case_templates.read")
  async getTemplate(@CurrentUser() user: AuthUser, @Param("templateId") templateId: string) {
    return this.casesService.getTemplate(user, templateId);
  }

  @Patch("templates/:templateId")
  @RequirePermissions("case_templates.update")
  @NotifyEntity({ type: "case_template", labelField: "name" })
  async updateTemplate(
    @CurrentUser() user: AuthUser,
    @Param("templateId") templateId: string,
    @Body() body: UpdateTemplateForOrgBody,
  ) {
    return this.casesService.updateTemplate(user, templateId, body);
  }

  @Delete("templates/:templateId")
  @RequirePermissions("case_templates.delete")
  @NotifyEntity({ type: "case_template", idParam: "templateId" })
  async deleteTemplate(@CurrentUser() user: AuthUser, @Param("templateId") templateId: string) {
    return this.casesService.deleteTemplate(user, templateId);
  }

  @Post("items")
  @RequirePermissions("cases.create")
  @NotifyEntity({ type: "case", labelField: "title" })
  async createCase(@CurrentUser() user: AuthUser, @Body() body: CreateCaseForOrgBody) {
    return this.casesService.createCase(user, body);
  }

  @Get("items")
  @RequirePermissions("cases.read")
  async listCases(
    @CurrentUser() user: AuthUser,
    @Query("status") status?: string,
    @Query("billingStatus") billingStatus?: string,
    @Query("assigneeId") assigneeId?: string,
    @Query("priority") priority?: string,
    @Query("search") search?: string,
    @Query("customerId") customerId?: string,
  ) {
    return this.casesService.listCases(user, {
      status,
      billingStatus,
      assigneeId,
      priority,
      search,
      customerId,
    });
  }

  @Get("items/:caseId")
  @RequirePermissions("cases.read")
  async getCase(@CurrentUser() user: AuthUser, @Param("caseId") caseId: string) {
    return this.casesService.getCase(user, caseId);
  }

  @Patch("items/:caseId")
  @RequirePermissions("cases.update")
  @NotifyEntity({ type: "case", labelField: "title" })
  async updateCase(
    @CurrentUser() user: AuthUser,
    @Param("caseId") caseId: string,
    @Body() body: UpdateCaseForOrgBody,
  ) {
    return this.casesService.updateCase(user, caseId, body);
  }

  @Delete("items/:caseId")
  @RequirePermissions("cases.delete")
  @NotifyEntity({ type: "case", idParam: "caseId" })
  async deleteCase(@CurrentUser() user: AuthUser, @Param("caseId") caseId: string) {
    return this.casesService.deleteCase(user, caseId);
  }

  @Put("items/:caseId/todos")
  @RequirePermissions("cases.update")
  @NotifyEntity({ type: "case", labelField: "title", action: "updated" })
  async updateTodo(
    @CurrentUser() user: AuthUser,
    @Param("caseId") caseId: string,
    @Body() body: UpdateTodoForOrgBody,
  ) {
    return this.casesService.updateTodo(user, caseId, body);
  }

  @Get("items/:caseId/history")
  @RequirePermissions("cases.read")
  async listCaseHistory(@CurrentUser() user: AuthUser, @Param("caseId") caseId: string) {
    return this.casesService.listCaseHistory(user, caseId);
  }

  @Post("interventions")
  @RequirePermissions("interventions.create")
  @NotifyEntity({
    type: "intervention",
    labelField: "title",
    relatedEntityType: "case",
    relatedEntityIdField: "caseId",
    relatedEntityLabelField: "caseTitle",
  })
  async createIntervention(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateInterventionForOrgBody,
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
    @Query("status") status?: string,
    @Query("unscheduled") unscheduled?: string,
    @Query("includeTeamAssignments") includeTeamAssignments?: string,
  ) {
    return this.casesService.listInterventions(user, {
      caseId,
      assigneeId,
      startDate,
      endDate,
      status,
      unscheduled,
      includeTeamAssignments,
    });
  }

  @Get("interventions/:interventionId")
  @RequirePermissions("interventions.read")
  async getIntervention(
    @CurrentUser() user: AuthUser,
    @Param("interventionId") interventionId: string,
  ) {
    return this.casesService.getIntervention(user, interventionId);
  }

  @Patch("interventions/:interventionId")
  @RequirePermissions("interventions.update")
  @NotifyEntity({
    type: "intervention",
    labelField: "title",
    relatedEntityType: "case",
    relatedEntityIdField: "caseId",
    relatedEntityLabelField: "caseTitle",
  })
  async updateIntervention(
    @CurrentUser() user: AuthUser,
    @Param("interventionId") interventionId: string,
    @Body() body: UpdateInterventionForOrgBody,
  ) {
    return this.casesService.updateIntervention(user, interventionId, body);
  }

  @Delete("interventions/:interventionId")
  @RequirePermissions("interventions.delete")
  @NotifyEntity({ type: "intervention", idParam: "interventionId" })
  async deleteIntervention(
    @CurrentUser() user: AuthUser,
    @Param("interventionId") interventionId: string,
  ) {
    return this.casesService.deleteIntervention(user, interventionId);
  }

  @Post("interventions/:interventionId/start")
  @RequirePermissions("interventions.update")
  @NotifyEntity({
    type: "intervention",
    idParam: "interventionId",
    labelField: "title",
    relatedEntityType: "case",
    relatedEntityIdField: "caseId",
    relatedEntityLabelField: "caseTitle",
    fixedDetail: "Intervention démarrée",
  })
  async startIntervention(
    @CurrentUser() user: AuthUser,
    @Param("interventionId") interventionId: string,
    @Body() body: StartInterventionForOrgBody,
  ) {
    return this.casesService.startIntervention(user, interventionId, body);
  }

  @Post("interventions/:interventionId/complete")
  @RequirePermissions("interventions.update")
  @NotifyEntity({
    type: "intervention",
    idParam: "interventionId",
    labelField: "title",
    relatedEntityType: "case",
    relatedEntityIdField: "caseId",
    relatedEntityLabelField: "caseTitle",
    fixedDetail: "Intervention terminée",
  })
  async completeIntervention(
    @CurrentUser() user: AuthUser,
    @Param("interventionId") interventionId: string,
    @Body() body: CompleteInterventionForOrgBody,
  ) {
    return this.casesService.completeIntervention(user, interventionId, body);
  }

  @Post("interventions/:interventionId/sign")
  @RequirePermissions("interventions.sign")
  @NotifyEntity({
    type: "intervention",
    idParam: "interventionId",
    labelField: "title",
    relatedEntityType: "case",
    relatedEntityIdField: "caseId",
    relatedEntityLabelField: "caseTitle",
    fixedDetail: "Intervention signée par le client",
  })
  async signIntervention(
    @CurrentUser() user: AuthUser,
    @Param("interventionId") interventionId: string,
    @Body() body: SignInterventionForOrgBody,
  ) {
    return this.casesService.signIntervention(user, interventionId, body);
  }

  @Get("interventions/:interventionId/report")
  @RequirePermissions("interventions.read")
  async generateInterventionReport(
    @CurrentUser() user: AuthUser,
    @Param("interventionId") interventionId: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.casesService.generateInterventionReport(user, interventionId);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="rapport-intervention-${interventionId}.pdf"`,
    );
    res.send(pdfBuffer);
  }

  @Post("quotes")
  @RequirePermissions("quotes.create")
  async createQuote(@CurrentUser() user: AuthUser, @Body() body: CreateQuoteForOrgBody) {
    return this.casesService.createQuote(user, body);
  }

  @Get("quotes")
  @RequirePermissions("quotes.read")
  async listQuotes(
    @CurrentUser() user: AuthUser,
    @Query("caseId") caseId?: string,
    @Query("status") status?: string,
  ) {
    return this.casesService.listQuotes(user, { caseId, status });
  }

  @Get("quotes/:quoteId")
  @RequirePermissions("quotes.read")
  async getQuote(@CurrentUser() user: AuthUser, @Param("quoteId") quoteId: string) {
    return this.casesService.getQuote(user, quoteId);
  }

  @Patch("quotes/:quoteId")
  @RequirePermissions("quotes.update")
  async updateQuote(
    @CurrentUser() user: AuthUser,
    @Param("quoteId") quoteId: string,
    @Body() body: UpdateQuoteForOrgBody,
  ) {
    return this.casesService.updateQuote(user, quoteId, body);
  }

  @Delete("quotes/:quoteId")
  @RequirePermissions("quotes.delete")
  async deleteQuote(@CurrentUser() user: AuthUser, @Param("quoteId") quoteId: string) {
    return this.casesService.deleteQuote(user, quoteId);
  }

  @Post("quotes/preview-pdf")
  @RequirePermissions("quotes.read")
  async previewQuotePdf(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateQuoteForOrgBody,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.casesService.previewQuotePdf(user, body);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="devis-apercu.pdf"');
    res.send(pdfBuffer);
  }

  @Get("quotes/:quoteId/pdf")
  @RequirePermissions("quotes.read")
  async generateQuotePdf(
    @CurrentUser() user: AuthUser,
    @Param("quoteId") quoteId: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.casesService.generateQuotePdf(user, quoteId);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="devis-${quoteId}.pdf"`);
    res.send(pdfBuffer);
  }

  @Get("dashboard")
  @RequirePermissions("cases.read")
  async getDashboard(@CurrentUser() user: AuthUser) {
    return this.casesService.getDashboard(user);
  }

  @Get("dashboard/todo-cases")
  @RequirePermissions("cases.read")
  async getDashboardTodoCases(
    @CurrentUser() user: AuthUser,
    @Query("templateId") templateId: string,
    @Query("todoLabel") todoLabel: string,
  ) {
    return this.casesService.getDashboardTodoCases(user, templateId, todoLabel);
  }

  @Get("dashboard/stat-cases")
  @RequirePermissions("cases.read")
  async getDashboardStatCases(@CurrentUser() user: AuthUser, @Query("filter") filter: string) {
    if (!filter || !isDashboardStatFilter(filter)) {
      throw new BadRequestException(
        "filter query param is required (assigned, in_progress, completed_week, overdue)",
      );
    }
    return this.casesService.getDashboardStatCases(user, filter);
  }
}
