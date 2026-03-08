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
import { AbstractTechniciansService } from "../../domain/ports/technicians.service.port";
import type {
  CreateTechnicianBody,
  UpdateTechnicianBody
} from "@syncora/shared";

@Controller("technicians")
export class TechniciansController {
  constructor(private readonly techniciansService: AbstractTechniciansService) {}

  @Post()
  async createTechnician(@Body() body: CreateTechnicianBody) {
    return this.techniciansService.createTechnician(body);
  }

  @Get()
  async listTechnicians(@Query("organizationId") organizationId: string) {
    this.ensureOrganizationId(organizationId);
    return this.techniciansService.listTechnicians(organizationId);
  }

  @Get(":id")
  async getTechnician(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string
  ) {
    this.ensureOrganizationId(organizationId);
    return this.techniciansService.getTechnician(organizationId, id);
  }

  @Patch(":id")
  async updateTechnician(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string,
    @Body() body: UpdateTechnicianBody
  ) {
    this.ensureOrganizationId(organizationId);
    return this.techniciansService.updateTechnician(organizationId, id, body);
  }

  @Delete(":id")
  async deleteTechnician(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string
  ) {
    this.ensureOrganizationId(organizationId);
    return this.techniciansService.deleteTechnician(organizationId, id);
  }

  @Put(":id/link-user")
  async linkUserToTechnician(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string,
    @Body() body: { userId: string }
  ) {
    this.ensureOrganizationId(organizationId);
    return this.techniciansService.linkUserToTechnician(organizationId, id, body.userId);
  }

  @Put(":id/vehicles/:vehicleId")
  async addVehicleAssignment(
    @Param("id") id: string,
    @Param("vehicleId") vehicleId: string,
    @Query("organizationId") organizationId: string
  ) {
    this.ensureOrganizationId(organizationId);
    return this.techniciansService.addVehicleAssignment(organizationId, id, vehicleId);
  }

  @Delete(":id/vehicles/:vehicleId")
  async removeVehicleAssignment(
    @Param("id") id: string,
    @Param("vehicleId") vehicleId: string,
    @Query("organizationId") organizationId: string
  ) {
    this.ensureOrganizationId(organizationId);
    return this.techniciansService.removeVehicleAssignment(organizationId, id, vehicleId);
  }

  private ensureOrganizationId(organizationId: string): void {
    if (!organizationId) {
      throw new BadRequestException("organizationId query param is required");
    }
  }
}
