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
import { DossiersGatewayService } from "../../domain/dossiers.service";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import { CurrentUser } from "../../infrastructure/current-user.decorator";
import type { AuthUser } from "@syncora/shared";
import type {
  CreateDossierForOrgBody,
  CreateInterventionForOrgBody,
  CreateTemplateForOrgBody,
  UpdateDossierForOrgBody,
  UpdateInterventionForOrgBody,
  UpdateTemplateForOrgBody,
  UpdateTodoForOrgBody
} from "../../domain/dossiers.service";

@Controller("dossiers")
@UseGuards(JwtAuthGuard)
export class DossiersController {
  constructor(private readonly dossiersService: DossiersGatewayService) {}

  // ── Templates ──

  @Post("templates")
  async createTemplate(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateTemplateForOrgBody
  ) {
    return this.dossiersService.createTemplate(user, body);
  }

  @Get("templates")
  async listTemplates(@CurrentUser() user: AuthUser) {
    return this.dossiersService.listTemplates(user);
  }

  @Get("templates/:templateId")
  async getTemplate(
    @CurrentUser() user: AuthUser,
    @Param("templateId") templateId: string
  ) {
    return this.dossiersService.getTemplate(user, templateId);
  }

  @Patch("templates/:templateId")
  async updateTemplate(
    @CurrentUser() user: AuthUser,
    @Param("templateId") templateId: string,
    @Body() body: UpdateTemplateForOrgBody
  ) {
    return this.dossiersService.updateTemplate(user, templateId, body);
  }

  @Delete("templates/:templateId")
  async deleteTemplate(
    @CurrentUser() user: AuthUser,
    @Param("templateId") templateId: string
  ) {
    return this.dossiersService.deleteTemplate(user, templateId);
  }

  // ── Dossiers ──

  @Post("items")
  async createDossier(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateDossierForOrgBody
  ) {
    return this.dossiersService.createDossier(user, body);
  }

  @Get("items")
  async listDossiers(
    @CurrentUser() user: AuthUser,
    @Query("status") status?: string,
    @Query("assigneeId") assigneeId?: string,
    @Query("priority") priority?: string,
    @Query("search") search?: string
  ) {
    return this.dossiersService.listDossiers(user, { status, assigneeId, priority, search });
  }

  @Get("items/:dossierId")
  async getDossier(
    @CurrentUser() user: AuthUser,
    @Param("dossierId") dossierId: string
  ) {
    return this.dossiersService.getDossier(user, dossierId);
  }

  @Patch("items/:dossierId")
  async updateDossier(
    @CurrentUser() user: AuthUser,
    @Param("dossierId") dossierId: string,
    @Body() body: UpdateDossierForOrgBody
  ) {
    return this.dossiersService.updateDossier(user, dossierId, body);
  }

  @Delete("items/:dossierId")
  async deleteDossier(
    @CurrentUser() user: AuthUser,
    @Param("dossierId") dossierId: string
  ) {
    return this.dossiersService.deleteDossier(user, dossierId);
  }

  @Put("items/:dossierId/todos")
  async updateTodo(
    @CurrentUser() user: AuthUser,
    @Param("dossierId") dossierId: string,
    @Body() body: UpdateTodoForOrgBody
  ) {
    return this.dossiersService.updateTodo(user, dossierId, body);
  }

  // ── Interventions ──

  @Post("interventions")
  async createIntervention(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateInterventionForOrgBody
  ) {
    return this.dossiersService.createIntervention(user, body);
  }

  @Get("interventions")
  async listInterventions(
    @CurrentUser() user: AuthUser,
    @Query("dossierId") dossierId?: string,
    @Query("assigneeId") assigneeId?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("status") status?: string
  ) {
    return this.dossiersService.listInterventions(user, {
      dossierId,
      assigneeId,
      startDate,
      endDate,
      status
    });
  }

  @Get("interventions/:interventionId")
  async getIntervention(
    @CurrentUser() user: AuthUser,
    @Param("interventionId") interventionId: string
  ) {
    return this.dossiersService.getIntervention(user, interventionId);
  }

  @Patch("interventions/:interventionId")
  async updateIntervention(
    @CurrentUser() user: AuthUser,
    @Param("interventionId") interventionId: string,
    @Body() body: UpdateInterventionForOrgBody
  ) {
    return this.dossiersService.updateIntervention(user, interventionId, body);
  }

  @Delete("interventions/:interventionId")
  async deleteIntervention(
    @CurrentUser() user: AuthUser,
    @Param("interventionId") interventionId: string
  ) {
    return this.dossiersService.deleteIntervention(user, interventionId);
  }

  // ── Dashboard ──

  @Get("dashboard")
  async getDashboard(@CurrentUser() user: AuthUser) {
    return this.dossiersService.getDashboard(user);
  }
}
