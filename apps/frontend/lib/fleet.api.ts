import type {
  VehicleResponse,
  TechnicianResponse,
  VehicleType,
  VehicleStatus,
  TechnicianStatus,
  UpdateVehicleBody,
  UpdateTechnicianBody
} from "@syncora/shared";
import { getToken } from "./auth.api";

const API_BASE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL) ||
  "http://localhost:3000/api";

type ApiMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

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
  body?: unknown
): Promise<TResponse> {
  const token = getToken();
  if (!token) throw new Error("Session expirée");

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: typeof body === "undefined" ? undefined : JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const message = (err as { message?: string | string[] }).message;
    if (Array.isArray(message)) throw new Error(message.join(", "));
    throw new Error(message ?? "Erreur API");
  }

  return response.json() as Promise<TResponse>;
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

export function assignTechnicianToVehicle(vehicleId: string, technicianId: string) {
  return fleetRequest<VehicleResponse>("PUT", `/fleet/vehicles/${vehicleId}/assign`, {
    technicianId
  });
}

export function unassignTechnicianFromVehicle(vehicleId: string) {
  return fleetRequest<VehicleResponse>("DELETE", `/fleet/vehicles/${vehicleId}/assign`);
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
  return fleetRequest<TechnicianResponse>(
    "PATCH",
    `/fleet/technicians/${technicianId}`,
    payload
  );
}

export function deleteTechnician(technicianId: string) {
  return fleetRequest<{ deleted: true }>("DELETE", `/fleet/technicians/${technicianId}`);
}

export function createTechnicianUserAccount(technicianId: string, password: string) {
  return fleetRequest<TechnicianResponse>(
    "POST",
    `/fleet/technicians/${technicianId}/create-account`,
    { password }
  );
}
