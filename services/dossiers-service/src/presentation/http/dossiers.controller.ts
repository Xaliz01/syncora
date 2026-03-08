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
import { DossiersService } from "../../domain/dossiers.service";
import type {
  CreateDossierBody,
  CreateDossierTemplateBody,
  CreateInterventionBody,
  UpdateDossierBody,
  UpdateDossierTemplateBody,
  UpdateInterventionBody,
  UpdateTodoBody
} from "@syncora/shared";

@Controller()
export class DossiersController {
  constructor(private readonly dossiersService: DossiersService) {}

  // ── Templates ──

  @Post("templates")
  async createTemplate(@Body() body: CreateDossierTemplateBody) {
    return this.dossiersService.createTemplate(body);
  }

  @Get("templates")
  async listTemplates(@Query("organizationId") organizationId: string) {
    this.ensureOrganizationId(organizationId);
    return this.dossiersService.listTemplates(organizationId);
  }

  @Get("templates/:id")
  async getTemplate(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string
  ) {
    this.ensureOrganizationId(organizationId);
    return this.dossiersService.getTemplate(id, organizationId);
  }

  @Patch("templates/:id")
  async updateTemplate(@Param("id") id: string, @Body() body: UpdateDossierTemplateBody) {
    return this.dossiersService.updateTemplate(id, body);
  }

  @Delete("templates/:id")
  async deleteTemplate(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string
  ) {
    this.ensureOrganizationId(organizationId);
    return this.dossiersService.deleteTemplate(id, organizationId);
  }

  // ── Dossiers ──

  @Post("dossiers")
  async createDossier(@Body() body: CreateDossierBody) {
    return this.dossiersService.createDossier(body);
  }

  @Get("dossiers")
  async listDossiers(
    @Query("organizationId") organizationId: string,
    @Query("status") status?: string,
    @Query("assigneeId") assigneeId?: string,
    @Query("priority") priority?: string,
    @Query("search") search?: string
  ) {
    this.ensureOrganizationId(organizationId);
    return this.dossiersService.listDossiers(organizationId, {
      status,
      assigneeId,
      priority,
      search
    });
  }

  @Get("dossiers/:id")
  async getDossier(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string
  ) {
    this.ensureOrganizationId(organizationId);
    return this.dossiersService.getDossier(id, organizationId);
  }

  @Patch("dossiers/:id")
  async updateDossier(@Param("id") id: string, @Body() body: UpdateDossierBody) {
    return this.dossiersService.updateDossier(id, body);
  }

  @Delete("dossiers/:id")
  async deleteDossier(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string
  ) {
    this.ensureOrganizationId(organizationId);
    return this.dossiersService.deleteDossier(id, organizationId);
  }

  @Put("dossiers/:id/todos")
  async updateTodo(@Param("id") id: string, @Body() body: UpdateTodoBody) {
    return this.dossiersService.updateTodo(id, body);
  }

  // ── Interventions ──

  @Post("interventions")
  async createIntervention(@Body() body: CreateInterventionBody) {
    return this.dossiersService.createIntervention(body);
  }

  @Get("interventions")
  async listInterventions(
    @Query("organizationId") organizationId: string,
    @Query("dossierId") dossierId?: string,
    @Query("assigneeId") assigneeId?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("status") status?: string
  ) {
    this.ensureOrganizationId(organizationId);
    return this.dossiersService.listInterventions(organizationId, {
      dossierId,
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
    return this.dossiersService.getIntervention(id, organizationId);
  }

  @Patch("interventions/:id")
  async updateIntervention(@Param("id") id: string, @Body() body: UpdateInterventionBody) {
    return this.dossiersService.updateIntervention(id, body);
  }

  @Delete("interventions/:id")
  async deleteIntervention(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string
  ) {
    this.ensureOrganizationId(organizationId);
    return this.dossiersService.deleteIntervention(id, organizationId);
  }

  // ── Dashboard ──

  @Get("dashboard")
  async getDashboard(
    @Query("organizationId") organizationId: string,
    @Query("userId") userId: string
  ) {
    this.ensureOrganizationId(organizationId);
    if (!userId) throw new BadRequestException("userId query param is required");
    return this.dossiersService.getDashboard(organizationId, userId);
  }

  private ensureOrganizationId(organizationId: string): void {
    if (!organizationId) {
      throw new BadRequestException("organizationId query param is required");
    }
  }
}
