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
import { AbstractFleetService } from "../../domain/ports/fleet.service.port";
import type {
  AssignTeamToVehicleBody,
  CreateVehicleBody,
  UpdateVehicleBody
} from "@syncora/shared";

@Controller("vehicles")
export class FleetController {
  constructor(private readonly fleetService: AbstractFleetService) {}

  @Post()
  async createVehicle(@Body() body: CreateVehicleBody) {
    return this.fleetService.createVehicle(body);
  }

  @Get()
  async listVehicles(@Query("organizationId") organizationId: string) {
    this.ensureOrganizationId(organizationId);
    return this.fleetService.listVehicles(organizationId);
  }

  @Get(":id")
  async getVehicle(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string
  ) {
    this.ensureOrganizationId(organizationId);
    return this.fleetService.getVehicle(organizationId, id);
  }

  @Patch(":id")
  async updateVehicle(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string,
    @Body() body: UpdateVehicleBody
  ) {
    this.ensureOrganizationId(organizationId);
    return this.fleetService.updateVehicle(organizationId, id, body);
  }

  @Delete(":id")
  async deleteVehicle(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string
  ) {
    this.ensureOrganizationId(organizationId);
    return this.fleetService.deleteVehicle(organizationId, id);
  }

  @Put(":id/assign-team")
  async assignTeam(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string,
    @Body() body: AssignTeamToVehicleBody
  ) {
    this.ensureOrganizationId(organizationId);
    return this.fleetService.assignTeam(organizationId, id, body.teamId);
  }

  @Delete(":id/assign-team")
  async unassignTeam(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string
  ) {
    this.ensureOrganizationId(organizationId);
    return this.fleetService.unassignTeam(organizationId, id);
  }

  @Delete("by-team/:teamId")
  async unassignTeamFromAllVehicles(
    @Param("teamId") teamId: string,
    @Query("organizationId") organizationId: string
  ) {
    this.ensureOrganizationId(organizationId);
    await this.fleetService.unassignTeamFromAllVehicles(organizationId, teamId);
    return { success: true };
  }

  private ensureOrganizationId(organizationId: string): void {
    if (!organizationId) {
      throw new BadRequestException("organizationId query param is required");
    }
  }
}
