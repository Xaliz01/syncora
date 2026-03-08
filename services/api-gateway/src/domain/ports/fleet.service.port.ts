import type {
  AuthUser,
  VehicleResponse,
  UpdateVehicleBody,
  TechnicianResponse,
  UpdateTechnicianBody,
  AssignTechnicianToVehicleBody,
  CreateTechnicianUserAccountBody,
  VehicleType,
  VehicleStatus,
  TechnicianStatus
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
    }
  ): Promise<VehicleResponse>;
  abstract listVehicles(currentUser: AuthUser): Promise<VehicleResponse[]>;
  abstract getVehicle(currentUser: AuthUser, vehicleId: string): Promise<VehicleResponse>;
  abstract updateVehicle(
    currentUser: AuthUser,
    vehicleId: string,
    body: UpdateVehicleBody
  ): Promise<VehicleResponse>;
  abstract deleteVehicle(currentUser: AuthUser, vehicleId: string): Promise<{ deleted: true }>;
  abstract assignTechnicianToVehicle(
    currentUser: AuthUser,
    vehicleId: string,
    body: AssignTechnicianToVehicleBody
  ): Promise<VehicleResponse>;
  abstract unassignTechnicianFromVehicle(
    currentUser: AuthUser,
    vehicleId: string
  ): Promise<VehicleResponse>;
  abstract createTechnician(
    currentUser: AuthUser,
    body: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      speciality?: string;
      status?: TechnicianStatus;
      createUserAccount?: boolean;
      userAccountPassword?: string;
    }
  ): Promise<TechnicianResponse>;
  abstract listTechnicians(currentUser: AuthUser): Promise<TechnicianResponse[]>;
  abstract getTechnician(
    currentUser: AuthUser,
    technicianId: string
  ): Promise<TechnicianResponse>;
  abstract updateTechnician(
    currentUser: AuthUser,
    technicianId: string,
    body: UpdateTechnicianBody
  ): Promise<TechnicianResponse>;
  abstract deleteTechnician(
    currentUser: AuthUser,
    technicianId: string
  ): Promise<{ deleted: true }>;
  abstract createTechnicianUserAccount(
    currentUser: AuthUser,
    technicianId: string,
    body: CreateTechnicianUserAccountBody
  ): Promise<TechnicianResponse>;
}
