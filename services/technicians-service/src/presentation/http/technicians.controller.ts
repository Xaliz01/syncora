import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from "@nestjs/common";
import { parseOrganizationIdQuery } from "@syncora/shared/nest";
import { AbstractTechniciansService } from "../../domain/ports/technicians.service.port";
import type { CreateTechnicianBody, UpdateTechnicianBody } from "@syncora/shared";

@Controller("technicians")
export class TechniciansController {
  constructor(private readonly techniciansService: AbstractTechniciansService) {}

  @Post()
  async createTechnician(@Body() body: CreateTechnicianBody) {
    return this.techniciansService.createTechnician(body);
  }

  @Get()
  async listTechnicians(@Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.techniciansService.listTechnicians(organizationId);
  }

  @Get(":id")
  async getTechnician(@Param("id") id: string, @Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.techniciansService.getTechnician(organizationId, id);
  }

  @Patch(":id")
  async updateTechnician(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string,
    @Body() body: UpdateTechnicianBody,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.techniciansService.updateTechnician(organizationId, id, body);
  }

  @Delete(":id")
  async deleteTechnician(@Param("id") id: string, @Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.techniciansService.deleteTechnician(organizationId, id);
  }

  @Put(":id/link-user")
  async linkUserToTechnician(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string,
    @Body() body: { userId: string },
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.techniciansService.linkUserToTechnician(organizationId, id, body.userId);
  }
}
