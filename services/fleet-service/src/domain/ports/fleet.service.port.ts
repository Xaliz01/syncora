import type {
  CreateVehicleBody,
  UpdateVehicleBody,
  VehicleResponse
} from "@syncora/shared";

export abstract class AbstractFleetService {
  abstract createVehicle(body: CreateVehicleBody): Promise<VehicleResponse>;
  abstract updateVehicle(
    organizationId: string,
    vehicleId: string,
    body: UpdateVehicleBody
  ): Promise<VehicleResponse>;
  abstract getVehicle(organizationId: string, vehicleId: string): Promise<VehicleResponse>;
  abstract listVehicles(organizationId: string): Promise<VehicleResponse[]>;
  abstract deleteVehicle(organizationId: string, vehicleId: string): Promise<{ deleted: true }>;
  abstract assignTechnician(
    organizationId: string,
    vehicleId: string,
    technicianId: string
  ): Promise<VehicleResponse>;
  abstract unassignTechnician(
    organizationId: string,
    vehicleId: string
  ): Promise<VehicleResponse>;
  abstract unassignTechnicianFromAllVehicles(
    organizationId: string,
    technicianId: string
  ): Promise<void>;
  abstract assignTeam(
    organizationId: string,
    vehicleId: string,
    teamId: string
  ): Promise<VehicleResponse>;
  abstract unassignTeam(
    organizationId: string,
    vehicleId: string
  ): Promise<VehicleResponse>;
  abstract unassignTeamFromAllVehicles(
    organizationId: string,
    teamId: string
  ): Promise<void>;
}
