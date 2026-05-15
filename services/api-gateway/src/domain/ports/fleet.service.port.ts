import type {
  AuthUser,
  VehicleResponse,
  UpdateVehicleBody,
  AssignTeamToVehicleBody,
  VehicleType,
  VehicleStatus,
} from "@syncora/shared";

export abstract class AbstractFleetGatewayService {
  abstract createVehicle(
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
  ): Promise<VehicleResponse>;
  abstract listVehicles(currentUser: AuthUser): Promise<VehicleResponse[]>;
  abstract getVehicle(currentUser: AuthUser, vehicleId: string): Promise<VehicleResponse>;
  abstract updateVehicle(
    currentUser: AuthUser,
    vehicleId: string,
    body: UpdateVehicleBody,
  ): Promise<VehicleResponse>;
  abstract deleteVehicle(currentUser: AuthUser, vehicleId: string): Promise<{ deleted: true }>;
  abstract assignTeamToVehicle(
    currentUser: AuthUser,
    vehicleId: string,
    body: AssignTeamToVehicleBody,
  ): Promise<VehicleResponse>;
  abstract unassignTeamFromVehicle(
    currentUser: AuthUser,
    vehicleId: string,
  ): Promise<VehicleResponse>;
}
