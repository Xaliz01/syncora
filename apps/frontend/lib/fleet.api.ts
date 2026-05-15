import type {
  VehicleResponse,
  TechnicianResponse,
  TeamResponse,
  AgenceResponse,
  VehicleType,
  VehicleStatus,
  TechnicianStatus,
  TeamStatus,
  UpdateVehicleBody,
  UpdateTechnicianBody,
  UpdateTeamBody,
  UpdateAgenceBody,
} from "@syncora/shared";
import { apiRequestJson, type ApiMethod } from "./api-client";

export interface CreateVehiclePayload {
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

export interface CreateTechnicianPayload {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  speciality?: string;
  status?: TechnicianStatus;
  createUserAccount?: boolean;
  userAccountPassword?: string;
}

async function fleetRequest<TResponse>(
  method: ApiMethod,
  path: string,
  body?: unknown,
): Promise<TResponse> {
  return apiRequestJson<TResponse>(method, path, typeof body === "undefined" ? {} : { body });
}

// ─── Vehicles ───

export function listVehicles() {
  return fleetRequest<VehicleResponse[]>("GET", "/fleet/vehicles");
}

export function getVehicle(vehicleId: string) {
  return fleetRequest<VehicleResponse>("GET", `/fleet/vehicles/${vehicleId}`);
}

export function createVehicle(payload: CreateVehiclePayload) {
  return fleetRequest<VehicleResponse>("POST", "/fleet/vehicles", payload);
}

export function updateVehicle(vehicleId: string, payload: UpdateVehicleBody) {
  return fleetRequest<VehicleResponse>("PATCH", `/fleet/vehicles/${vehicleId}`, payload);
}

export function deleteVehicle(vehicleId: string) {
  return fleetRequest<{ deleted: true }>("DELETE", `/fleet/vehicles/${vehicleId}`);
}

// ─── Technicians ───

export function listTechnicians() {
  return fleetRequest<TechnicianResponse[]>("GET", "/fleet/technicians");
}

export function getTechnician(technicianId: string) {
  return fleetRequest<TechnicianResponse>("GET", `/fleet/technicians/${technicianId}`);
}

export function createTechnician(payload: CreateTechnicianPayload) {
  return fleetRequest<TechnicianResponse>("POST", "/fleet/technicians", payload);
}

export function updateTechnician(technicianId: string, payload: UpdateTechnicianBody) {
  return fleetRequest<TechnicianResponse>("PATCH", `/fleet/technicians/${technicianId}`, payload);
}

export function deleteTechnician(technicianId: string) {
  return fleetRequest<{ deleted: true }>("DELETE", `/fleet/technicians/${technicianId}`);
}

export function createTechnicianUserAccount(technicianId: string, password: string) {
  return fleetRequest<TechnicianResponse>(
    "POST",
    `/fleet/technicians/${technicianId}/create-account`,
    { password },
  );
}

// ─── Teams (Équipes) ───

export interface CreateTeamPayload {
  name: string;
  agenceId?: string;
  technicianIds?: string[];
  status?: TeamStatus;
  calendarColor?: string;
}

export function listTeams() {
  return fleetRequest<TeamResponse[]>("GET", "/fleet/teams");
}

export function getTeam(teamId: string) {
  return fleetRequest<TeamResponse>("GET", `/fleet/teams/${teamId}`);
}

export function createTeam(payload: CreateTeamPayload) {
  return fleetRequest<TeamResponse>("POST", "/fleet/teams", payload);
}

export function updateTeam(teamId: string, payload: UpdateTeamBody) {
  return fleetRequest<TeamResponse>("PATCH", `/fleet/teams/${teamId}`, payload);
}

export function deleteTeam(teamId: string) {
  return fleetRequest<{ deleted: true }>("DELETE", `/fleet/teams/${teamId}`);
}

export function addTeamMember(teamId: string, technicianId: string) {
  return fleetRequest<TeamResponse>("PUT", `/fleet/teams/${teamId}/members/${technicianId}`);
}

export function removeTeamMember(teamId: string, technicianId: string) {
  return fleetRequest<TeamResponse>("DELETE", `/fleet/teams/${teamId}/members/${technicianId}`);
}

export function assignTeamToVehicle(vehicleId: string, teamId: string) {
  return fleetRequest<VehicleResponse>("PUT", `/fleet/vehicles/${vehicleId}/assign-team`, {
    teamId,
  });
}

export function unassignTeamFromVehicle(vehicleId: string) {
  return fleetRequest<VehicleResponse>("DELETE", `/fleet/vehicles/${vehicleId}/assign-team`);
}

// ─── Agences ───

export interface CreateAgencePayload {
  name: string;
  address?: string;
  city?: string;
  postalCode?: string;
  phone?: string;
}

export function listAgences() {
  return fleetRequest<AgenceResponse[]>("GET", "/fleet/agences");
}

export function getAgence(agenceId: string) {
  return fleetRequest<AgenceResponse>("GET", `/fleet/agences/${agenceId}`);
}

/**
 * Liste les agences puis complète par `getAgence` pour chaque `agenceId` d’équipe manquant
 * (ex. liste vide sans droit `agences.read` historique, ou agences hors liste).
 */
export async function resolveAgencesForTeams(teams: TeamResponse[]): Promise<AgenceResponse[]> {
  const byId = new Map<string, AgenceResponse>();
  try {
    const listed = await listAgences();
    for (const a of listed) {
      byId.set(a.id, a);
    }
  } catch {
    /* lecture liste impossible — on tente les agences référencées par les équipes */
  }
  const ids = [...new Set(teams.map((t) => t.agenceId).filter(Boolean))] as string[];
  for (const id of ids) {
    if (byId.has(id)) continue;
    try {
      const a = await getAgence(id);
      byId.set(id, a);
    } catch {
      /* ignore */
    }
  }
  return [...byId.values()];
}

export function createAgence(payload: CreateAgencePayload) {
  return fleetRequest<AgenceResponse>("POST", "/fleet/agences", payload);
}

export function updateAgence(agenceId: string, payload: UpdateAgenceBody) {
  return fleetRequest<AgenceResponse>("PATCH", `/fleet/agences/${agenceId}`, payload);
}

export function deleteAgence(agenceId: string) {
  return fleetRequest<{ deleted: true }>("DELETE", `/fleet/agences/${agenceId}`);
}
