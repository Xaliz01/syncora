import type {
  CreateVehicleBody,
  UpdateVehicleBody,
  VehicleResponse,
  CreateTechnicianBody,
  UpdateTechnicianBody,
  TechnicianResponse
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
  abstract assignTechnicianToVehicle(
    organizationId: string,
    vehicleId: string,
    technicianId: string
  ): Promise<VehicleResponse>;
  abstract unassignTechnicianFromVehicle(
    organizationId: string,
    vehicleId: string
  ): Promise<VehicleResponse>;
  abstract createTechnician(body: CreateTechnicianBody): Promise<TechnicianResponse>;
  abstract updateTechnician(
    organizationId: string,
    technicianId: string,
    body: UpdateTechnicianBody
  ): Promise<TechnicianResponse>;
  abstract getTechnician(
    organizationId: string,
    technicianId: string
  ): Promise<TechnicianResponse>;
  abstract listTechnicians(organizationId: string): Promise<TechnicianResponse[]>;
  abstract deleteTechnician(
    organizationId: string,
    technicianId: string
  ): Promise<{ deleted: true }>;
  abstract linkUserToTechnician(
    organizationId: string,
    technicianId: string,
    userId: string
  ): Promise<TechnicianResponse>;
}
