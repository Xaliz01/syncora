import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from "@nestjs/common";
import { parseOrganizationIdQuery } from "@syncora/shared/nest";
import { AbstractTeamsService } from "../../domain/ports/teams.service.port";
import type { CreateTeamBody, UpdateTeamBody } from "@syncora/shared";

@Controller("teams")
export class TeamsController {
  constructor(private readonly teamsService: AbstractTeamsService) {}

  @Post()
  async createTeam(@Body() body: CreateTeamBody) {
    return this.teamsService.createTeam(body);
  }

  @Get()
  async listTeams(@Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.teamsService.listTeams(organizationId);
  }

  @Get(":id")
  async getTeam(@Param("id") id: string, @Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.teamsService.getTeam(organizationId, id);
  }

  @Patch(":id")
  async updateTeam(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string,
    @Body() body: UpdateTeamBody,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.teamsService.updateTeam(organizationId, id, body);
  }

  @Delete(":id")
  async deleteTeam(@Param("id") id: string, @Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.teamsService.deleteTeam(organizationId, id);
  }

  @Put(":id/members/:technicianId")
  async addMember(
    @Param("id") id: string,
    @Param("technicianId") technicianId: string,
    @Query("organizationId") organizationId: string,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.teamsService.addMember(organizationId, id, technicianId);
  }

  @Delete(":id/members/:technicianId")
  async removeMember(
    @Param("id") id: string,
    @Param("technicianId") technicianId: string,
    @Query("organizationId") organizationId: string,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.teamsService.removeMember(organizationId, id, technicianId);
  }
}
