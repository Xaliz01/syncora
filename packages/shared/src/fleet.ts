/** Contrats API fleet-service (véhicules, techniciens, affectations) */

export const VEHICLE_TYPES = [
  "camion",
  "camionnette",
  "voiture",
  "utilitaire",
  "fourgon",
  "remorque",
  "autre"
] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const VEHICLE_STATUSES = ["actif", "maintenance", "hors_service"] as const;
export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

export const TECHNICIAN_STATUSES = ["actif", "inactif"] as const;
export type TechnicianStatus = (typeof TECHNICIAN_STATUSES)[number];

export interface CreateVehicleBody {
  organizationId: string;
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

export interface UpdateVehicleBody {
  type?: VehicleType;
  registrationNumber?: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  vin?: string;
  mileage?: number;
  status?: VehicleStatus;
}

export interface VehicleResponse {
  id: string;
  organizationId: string;
  type: VehicleType;
  registrationNumber: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  vin?: string;
  mileage?: number;
  status: VehicleStatus;
  assignedTechnicianId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTechnicianBody {
  organizationId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  speciality?: string;
  status?: TechnicianStatus;
}

export interface UpdateTechnicianBody {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  speciality?: string;
  status?: TechnicianStatus;
}

export interface TechnicianResponse {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  speciality?: string;
  status: TechnicianStatus;
  userId?: string;
  assignedVehicleIds: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AssignTechnicianToVehicleBody {
  technicianId: string;
}

export interface CreateTechnicianUserAccountBody {
  password: string;
}
