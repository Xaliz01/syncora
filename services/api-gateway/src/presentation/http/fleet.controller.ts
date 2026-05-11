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
import { RequirePermissionGuard, RequirePermissions } from "../../infrastructure/require-permission.guard";
import { SubscriptionAccessGuard } from "../../infrastructure/subscription-access.guard";
import { CurrentUser } from "../../infrastructure/current-user.decorator";
import { NotifyEntity } from "../../infrastructure/notify-entity.decorator";
import type { AuthUser } from "@syncora/shared";
import type {
  AssignTeamToVehicleBody,
  UpdateVehicleBody,
  VehicleType,
  VehicleStatus
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

@Controller("fleet")
@UseGuards(JwtAuthGuard, SubscriptionAccessGuard, RequirePermissionGuard)
export class FleetController {
  constructor(private readonly fleetService: AbstractFleetGatewayService) {}

  @Post("vehicles")
  @RequirePermissions("fleet.vehicles.create")
  @RequirePermissions("vehicles.create")
  @NotifyEntity({ type: "vehicle", labelField: "registrationNumber" })
  async createVehicle(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateVehiclePayload
  ) {
    return this.fleetService.createVehicle(user, body);
  }

  @Get("vehicles")
  @RequirePermissions("fleet.vehicles.read")
  @RequirePermissions("vehicles.read")
  async listVehicles(@CurrentUser() user: AuthUser) {
    return this.fleetService.listVehicles(user);
  }

  @Get("vehicles/:vehicleId")
  @RequirePermissions("fleet.vehicles.read")
  @RequirePermissions("vehicles.read")
  async getVehicle(
    @CurrentUser() user: AuthUser,
    @Param("vehicleId") vehicleId: string
  ) {
    return this.fleetService.getVehicle(user, vehicleId);
  }

  @Patch("vehicles/:vehicleId")
  @RequirePermissions("fleet.vehicles.update")
  @RequirePermissions("vehicles.update")
  @NotifyEntity({ type: "vehicle", labelField: "registrationNumber" })
  async updateVehicle(
    @CurrentUser() user: AuthUser,
    @Param("vehicleId") vehicleId: string,
    @Body() body: UpdateVehicleBody
  ) {
    return this.fleetService.updateVehicle(user, vehicleId, body);
  }

  @Delete("vehicles/:vehicleId")
  @RequirePermissions("fleet.vehicles.delete")
  @RequirePermissions("vehicles.delete")
  @NotifyEntity({ type: "vehicle", idParam: "vehicleId" })
  async deleteVehicle(
    @CurrentUser() user: AuthUser,
    @Param("vehicleId") vehicleId: string
  ) {
    return this.fleetService.deleteVehicle(user, vehicleId);
  }

  @Put("vehicles/:vehicleId/assign-team")
  @RequirePermissions("vehicles.update")
  @RequirePermissions("fleet.vehicles.assign")
  @NotifyEntity({ type: "vehicle", labelField: "registrationNumber", action: "updated" })
  async assignTeam(
    @CurrentUser() user: AuthUser,
    @Param("vehicleId") vehicleId: string,
    @Body() body: AssignTeamToVehicleBody
  ) {
    return this.fleetService.assignTeamToVehicle(user, vehicleId, body);
  }

  @Delete("vehicles/:vehicleId/assign-team")
  @RequirePermissions("vehicles.update")
  @RequirePermissions("fleet.vehicles.assign")
  @NotifyEntity({ type: "vehicle", idParam: "vehicleId", action: "updated" })
  async unassignTeam(
    @CurrentUser() user: AuthUser,
    @Param("vehicleId") vehicleId: string
  ) {
    return this.fleetService.unassignTeamFromVehicle(user, vehicleId);
  }
}
