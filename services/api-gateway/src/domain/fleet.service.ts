import { Injectable } from "@nestjs/common";
import type {
  AssignTeamToVehicleBody,
  AuthUser,
  UpdateVehicleBody,
  VehicleResponse,
  VehicleStatus,
  VehicleType,
} from "@planwise/shared";
import { AbstractFleetGatewayService } from "./ports/fleet.service.port";
import { AbstractFleetService } from "./fleet/ports/fleet.service.port";

@Injectable()
export class FleetGatewayService extends AbstractFleetGatewayService {
  constructor(private readonly fleetService: AbstractFleetService) {
    super();
  }

  async createVehicle(
    currentUser: AuthUser,
    body: {
      type: VehicleType;
      registrationNumber: string;
      brand?: string;
      model?: string;
      year?: number;
      color?: string;
      vin?: string;
      mileage?: number;
      status?: VehicleStatus;
    },
  ): Promise<VehicleResponse> {
    return this.fleetService.createVehicle({
      ...body,
      organizationId: currentUser.organizationId,
    });
  }

  async listVehicles(currentUser: AuthUser): Promise<VehicleResponse[]> {
    return this.fleetService.listVehicles(currentUser.organizationId);
  }

  async getVehicle(currentUser: AuthUser, vehicleId: string): Promise<VehicleResponse> {
    return this.fleetService.getVehicle(currentUser.organizationId, vehicleId);
  }

  async updateVehicle(
    currentUser: AuthUser,
    vehicleId: string,
    body: UpdateVehicleBody,
  ): Promise<VehicleResponse> {
    return this.fleetService.updateVehicle(currentUser.organizationId, vehicleId, body);
  }

  async deleteVehicle(currentUser: AuthUser, vehicleId: string): Promise<{ deleted: true }> {
    return this.fleetService.deleteVehicle(currentUser.organizationId, vehicleId);
  }

  async assignTeamToVehicle(
    currentUser: AuthUser,
    vehicleId: string,
    body: AssignTeamToVehicleBody,
  ): Promise<VehicleResponse> {
    return this.fleetService.assignTeam(currentUser.organizationId, vehicleId, body.teamId);
  }

  async unassignTeamFromVehicle(
    currentUser: AuthUser,
    vehicleId: string,
  ): Promise<VehicleResponse> {
    return this.fleetService.unassignTeam(currentUser.organizationId, vehicleId);
  }
}
