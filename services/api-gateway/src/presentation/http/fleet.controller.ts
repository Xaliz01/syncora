import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards
} from "@nestjs/common";
import { AbstractFleetGatewayService } from "../../domain/ports/fleet.service.port";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import { AdminRoleGuard } from "../../infrastructure/admin-role.guard";
import { CurrentUser } from "../../infrastructure/current-user.decorator";
import type { AuthUser } from "@syncora/shared";
import type {
  AssignTechnicianToVehicleBody,
  CreateTechnicianUserAccountBody,
  UpdateVehicleBody,
  UpdateTechnicianBody,
  VehicleType,
  VehicleStatus,
  TechnicianStatus
} from "@syncora/shared";

interface CreateVehiclePayload {
  type: VehicleType;
  registrationNumber: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  vin?: string;
  mileage?: number;
  status?: VehicleStatus;
}

interface CreateTechnicianPayload {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  speciality?: string;
  status?: TechnicianStatus;
  createUserAccount?: boolean;
  userAccountPassword?: string;
}

@Controller("fleet")
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class FleetController {
  constructor(private readonly fleetService: AbstractFleetGatewayService) {}

  @Post("vehicles")
  async createVehicle(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateVehiclePayload
  ) {
    return this.fleetService.createVehicle(user, body);
  }

  @Get("vehicles")
  async listVehicles(@CurrentUser() user: AuthUser) {
    return this.fleetService.listVehicles(user);
  }

  @Get("vehicles/:vehicleId")
  async getVehicle(
    @CurrentUser() user: AuthUser,
    @Param("vehicleId") vehicleId: string
  ) {
    return this.fleetService.getVehicle(user, vehicleId);
  }

  @Patch("vehicles/:vehicleId")
  async updateVehicle(
    @CurrentUser() user: AuthUser,
    @Param("vehicleId") vehicleId: string,
    @Body() body: UpdateVehicleBody
  ) {
    return this.fleetService.updateVehicle(user, vehicleId, body);
  }

  @Delete("vehicles/:vehicleId")
  async deleteVehicle(
    @CurrentUser() user: AuthUser,
    @Param("vehicleId") vehicleId: string
  ) {
    return this.fleetService.deleteVehicle(user, vehicleId);
  }

  @Put("vehicles/:vehicleId/assign")
  async assignTechnician(
    @CurrentUser() user: AuthUser,
    @Param("vehicleId") vehicleId: string,
    @Body() body: AssignTechnicianToVehicleBody
  ) {
    return this.fleetService.assignTechnicianToVehicle(user, vehicleId, body);
  }

  @Delete("vehicles/:vehicleId/assign")
  async unassignTechnician(
    @CurrentUser() user: AuthUser,
    @Param("vehicleId") vehicleId: string
  ) {
    return this.fleetService.unassignTechnicianFromVehicle(user, vehicleId);
  }

  @Post("technicians")
  async createTechnician(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateTechnicianPayload
  ) {
    return this.fleetService.createTechnician(user, body);
  }

  @Get("technicians")
  async listTechnicians(@CurrentUser() user: AuthUser) {
    return this.fleetService.listTechnicians(user);
  }

  @Get("technicians/:technicianId")
  async getTechnician(
    @CurrentUser() user: AuthUser,
    @Param("technicianId") technicianId: string
  ) {
    return this.fleetService.getTechnician(user, technicianId);
  }

  @Patch("technicians/:technicianId")
  async updateTechnician(
    @CurrentUser() user: AuthUser,
    @Param("technicianId") technicianId: string,
    @Body() body: UpdateTechnicianBody
  ) {
    return this.fleetService.updateTechnician(user, technicianId, body);
  }

  @Delete("technicians/:technicianId")
  async deleteTechnician(
    @CurrentUser() user: AuthUser,
    @Param("technicianId") technicianId: string
  ) {
    return this.fleetService.deleteTechnician(user, technicianId);
  }

  @Post("technicians/:technicianId/create-account")
  async createTechnicianAccount(
    @CurrentUser() user: AuthUser,
    @Param("technicianId") technicianId: string,
    @Body() body: CreateTechnicianUserAccountBody
  ) {
    return this.fleetService.createTechnicianUserAccount(user, technicianId, body);
  }
}
