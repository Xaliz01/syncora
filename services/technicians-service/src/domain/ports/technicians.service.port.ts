import type {
  CreateTechnicianBody,
  UpdateTechnicianBody,
  TechnicianResponse
} from "@syncora/shared";

export abstract class AbstractTechniciansService {
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
  abstract addVehicleAssignment(
    organizationId: string,
    technicianId: string,
    vehicleId: string
  ): Promise<TechnicianResponse>;
  abstract removeVehicleAssignment(
    organizationId: string,
    technicianId: string,
    vehicleId: string
  ): Promise<TechnicianResponse>;
}
