/** Contrats API fleet-service (véhicules, techniciens, équipes, agences, affectations) */

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

export const TEAM_STATUSES = ["active", "inactive"] as const;
export type TeamStatus = (typeof TEAM_STATUSES)[number];

// ── Vehicles ──

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
  assignedTeamId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ── Technicians ──

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
  teamId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssignTechnicianToVehicleBody {
  technicianId: string;
}

export interface CreateTechnicianUserAccountBody {
  password: string;
}

// ── Teams (Équipes) ──

export interface CreateTeamBody {
  organizationId: string;
  name: string;
  agenceId?: string;
  technicianIds?: string[];
  status?: TeamStatus;
}

export interface UpdateTeamBody {
  name?: string;
  agenceId?: string | null;
  technicianIds?: string[];
  status?: TeamStatus;
}

export interface TeamResponse {
  id: string;
  organizationId: string;
  name: string;
  agenceId?: string;
  agenceName?: string;
  technicianIds: string[];
  status: TeamStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssignTeamToVehicleBody {
  teamId: string;
}

// ── Agences ──

export interface CreateAgenceBody {
  organizationId: string;
  name: string;
  address?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
}

export interface UpdateAgenceBody {
  name?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
}

export interface AgenceResponse {
  id: string;
  organizationId: string;
  name: string;
  address?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
}
