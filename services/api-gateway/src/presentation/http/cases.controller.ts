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
import { AbstractCasesGatewayService } from "../../domain/ports/cases.service.port";
import type {
  CreateCaseForOrgBody,
  CreateInterventionForOrgBody,
  CreateTemplateForOrgBody,
  UpdateCaseForOrgBody,
  UpdateInterventionForOrgBody,
  UpdateTemplateForOrgBody,
  UpdateTodoForOrgBody
} from "../../domain/ports/cases.service.port";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import { RequirePermissionGuard, RequirePermissions } from "../../infrastructure/require-permission.guard";
import { SubscriptionAccessGuard } from "../../infrastructure/subscription-access.guard";
import { CurrentUser } from "../../infrastructure/current-user.decorator";
import { NotifyEntity } from "../../infrastructure/notify-entity.decorator";
import type { AuthUser } from "@syncora/shared";

@Controller("cases")
@UseGuards(JwtAuthGuard, SubscriptionAccessGuard, RequirePermissionGuard)
export class CasesController {
  constructor(private readonly casesService: AbstractCasesGatewayService) {}

  @Post("templates")
  @RequirePermissions("case_templates.create")
  @NotifyEntity({ type: "case_template", labelField: "name" })
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
  @NotifyEntity({ type: "case_template", labelField: "name" })
  async updateTemplate(
    @CurrentUser() user: AuthUser,
    @Param("templateId") templateId: string,
    @Body() body: UpdateTemplateForOrgBody
  ) {
    return this.casesService.updateTemplate(user, templateId, body);
  }

  @Delete("templates/:templateId")
  @RequirePermissions("case_templates.delete")
  @NotifyEntity({ type: "case_template", idParam: "templateId" })
  async deleteTemplate(
    @CurrentUser() user: AuthUser,
    @Param("templateId") templateId: string
  ) {
    return this.casesService.deleteTemplate(user, templateId);
  }

  @Post("items")
  @RequirePermissions("cases.create")
  @NotifyEntity({ type: "case", labelField: "title" })
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
  @NotifyEntity({ type: "case", labelField: "title" })
  async updateCase(
    @CurrentUser() user: AuthUser,
    @Param("caseId") caseId: string,
    @Body() body: UpdateCaseForOrgBody
  ) {
    return this.casesService.updateCase(user, caseId, body);
  }

  @Delete("items/:caseId")
  @RequirePermissions("cases.delete")
  @NotifyEntity({ type: "case", idParam: "caseId" })
  async deleteCase(
    @CurrentUser() user: AuthUser,
    @Param("caseId") caseId: string
  ) {
    return this.casesService.deleteCase(user, caseId);
  }

  @Put("items/:caseId/todos")
  @RequirePermissions("cases.update")
  @NotifyEntity({ type: "case", labelField: "title", action: "updated" })
  async updateTodo(
    @CurrentUser() user: AuthUser,
    @Param("caseId") caseId: string,
    @Body() body: UpdateTodoForOrgBody
  ) {
    return this.casesService.updateTodo(user, caseId, body);
  }

  @Post("interventions")
  @RequirePermissions("interventions.create")
  @NotifyEntity({ type: "intervention", labelField: "title" })
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
    @Query("status") status?: string,
    @Query("unscheduled") unscheduled?: string
  ) {
    return this.casesService.listInterventions(user, {
      caseId,
      assigneeId,
      startDate,
      endDate,
      status,
      unscheduled
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
  @NotifyEntity({ type: "intervention", labelField: "title" })
  async updateIntervention(
    @CurrentUser() user: AuthUser,
    @Param("interventionId") interventionId: string,
    @Body() body: UpdateInterventionForOrgBody
  ) {
    return this.casesService.updateIntervention(user, interventionId, body);
  }

  @Delete("interventions/:interventionId")
  @RequirePermissions("interventions.delete")
  @NotifyEntity({ type: "intervention", idParam: "interventionId" })
  async deleteIntervention(
    @CurrentUser() user: AuthUser,
    @Param("interventionId") interventionId: string
  ) {
    return this.casesService.deleteIntervention(user, interventionId);
  }

  @Get("dashboard")
  @RequirePermissions("cases.read")
  async getDashboard(@CurrentUser() user: AuthUser) {
    return this.casesService.getDashboard(user);
  }
}
