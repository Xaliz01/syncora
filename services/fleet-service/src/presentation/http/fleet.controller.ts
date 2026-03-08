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
  AssignTechnicianToVehicleBody,
  CreateTechnicianBody,
  CreateVehicleBody,
  UpdateTechnicianBody,
  UpdateVehicleBody
} from "@syncora/shared";

@Controller()
export class FleetController {
  constructor(private readonly fleetService: AbstractFleetService) {}

  // ─── Vehicles ───

  @Post("vehicles")
  async createVehicle(@Body() body: CreateVehicleBody) {
    return this.fleetService.createVehicle(body);
  }

  @Get("vehicles")
  async listVehicles(@Query("organizationId") organizationId: string) {
    if (!organizationId) {
      throw new BadRequestException("organizationId query param is required");
    }
    return this.fleetService.listVehicles(organizationId);
  }

  @Get("vehicles/:id")
  async getVehicle(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string
  ) {
    if (!organizationId) {
      throw new BadRequestException("organizationId query param is required");
    }
    return this.fleetService.getVehicle(organizationId, id);
  }

  @Patch("vehicles/:id")
  async updateVehicle(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string,
    @Body() body: UpdateVehicleBody
  ) {
    if (!organizationId) {
      throw new BadRequestException("organizationId query param is required");
    }
    return this.fleetService.updateVehicle(organizationId, id, body);
  }

  @Delete("vehicles/:id")
  async deleteVehicle(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string
  ) {
    if (!organizationId) {
      throw new BadRequestException("organizationId query param is required");
    }
    return this.fleetService.deleteVehicle(organizationId, id);
  }

  @Put("vehicles/:id/assign")
  async assignTechnician(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string,
    @Body() body: AssignTechnicianToVehicleBody
  ) {
    if (!organizationId) {
      throw new BadRequestException("organizationId query param is required");
    }
    return this.fleetService.assignTechnicianToVehicle(
      organizationId,
      id,
      body.technicianId
    );
  }

  @Delete("vehicles/:id/assign")
  async unassignTechnician(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string
  ) {
    if (!organizationId) {
      throw new BadRequestException("organizationId query param is required");
    }
    return this.fleetService.unassignTechnicianFromVehicle(organizationId, id);
  }

  // ─── Technicians ───

  @Post("technicians")
  async createTechnician(@Body() body: CreateTechnicianBody) {
    return this.fleetService.createTechnician(body);
  }

  @Get("technicians")
  async listTechnicians(@Query("organizationId") organizationId: string) {
    if (!organizationId) {
      throw new BadRequestException("organizationId query param is required");
    }
    return this.fleetService.listTechnicians(organizationId);
  }

  @Get("technicians/:id")
  async getTechnician(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string
  ) {
    if (!organizationId) {
      throw new BadRequestException("organizationId query param is required");
    }
    return this.fleetService.getTechnician(organizationId, id);
  }

  @Patch("technicians/:id")
  async updateTechnician(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string,
    @Body() body: UpdateTechnicianBody
  ) {
    if (!organizationId) {
      throw new BadRequestException("organizationId query param is required");
    }
    return this.fleetService.updateTechnician(organizationId, id, body);
  }

  @Delete("technicians/:id")
  async deleteTechnician(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string
  ) {
    if (!organizationId) {
      throw new BadRequestException("organizationId query param is required");
    }
    return this.fleetService.deleteTechnician(organizationId, id);
  }

  @Put("technicians/:id/link-user")
  async linkUserToTechnician(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string,
    @Body() body: { userId: string }
  ) {
    if (!organizationId) {
      throw new BadRequestException("organizationId query param is required");
    }
    return this.fleetService.linkUserToTechnician(organizationId, id, body.userId);
  }
}
