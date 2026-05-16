import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { parseOrganizationIdQuery } from "@syncora/shared/nest";
import { AbstractAgencesService } from "../../domain/ports/agences.service.port";
import type { CreateAgenceBody, UpdateAgenceBody } from "@syncora/shared";

@Controller("agences")
export class AgencesController {
  constructor(private readonly agencesService: AbstractAgencesService) {}

  @Post()
  async createAgence(@Body() body: CreateAgenceBody) {
    return this.agencesService.createAgence(body);
  }

  @Get()
  async listAgences(@Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.agencesService.listAgences(organizationId);
  }

  @Get(":id")
  async getAgence(@Param("id") id: string, @Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.agencesService.getAgence(organizationId, id);
  }

  @Patch(":id")
  async updateAgence(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string,
    @Body() body: UpdateAgenceBody,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.agencesService.updateAgence(organizationId, id, body);
  }

  @Delete(":id")
  async deleteAgence(@Param("id") id: string, @Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.agencesService.deleteAgence(organizationId, id);
  }
}
