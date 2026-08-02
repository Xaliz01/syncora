import type {
  GenerateMaintenanceVisitResponse,
  MaintenanceContractResponse,
  MaintenanceContractsListResponse,
  MaintenanceContractStatus,
  MaintenanceRemindBeforeDays,
  MaintenanceSchedulingMode,
} from "@planwise/shared";
import { apiRequestJson, type ApiMethod } from "./api-client";

async function contractsRequest<TResponse>(
  method: ApiMethod,
  path: string,
  body?: unknown,
): Promise<TResponse> {
  return apiRequestJson<TResponse>(method, path, typeof body === "undefined" ? {} : { body });
}

export interface CreateMaintenanceContractPayload {
  customerId: string;
  siteId?: string;
  templateId?: string;
  title: string;
  description?: string;
  status?: MaintenanceContractStatus;
  startDate: string;
  endDate?: string;
  recurrenceMonths: number;
  nextDueDate?: string;
  schedulingMode?: MaintenanceSchedulingMode;
  remindBeforeDays?: MaintenanceRemindBeforeDays;
  defaultAssigneeId?: string;
  defaultTeamId?: string;
  notes?: string;
}

export interface UpdateMaintenanceContractPayload {
  customerId?: string;
  siteId?: string | null;
  templateId?: string | null;
  title?: string;
  description?: string | null;
  status?: MaintenanceContractStatus;
  startDate?: string;
  endDate?: string | null;
  recurrenceMonths?: number;
  nextDueDate?: string;
  schedulingMode?: MaintenanceSchedulingMode;
  remindBeforeDays?: MaintenanceRemindBeforeDays;
  defaultAssigneeId?: string | null;
  defaultTeamId?: string | null;
  notes?: string | null;
}

export function listMaintenanceContracts(filters?: {
  customerId?: string;
  status?: string;
  dueBefore?: string;
  toSchedule?: boolean;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.customerId) params.set("customerId", filters.customerId);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.dueBefore) params.set("dueBefore", filters.dueBefore);
  if (filters?.toSchedule) params.set("toSchedule", "true");
  if (filters?.limit != null) params.set("limit", String(filters.limit));
  if (filters?.offset != null) params.set("offset", String(filters.offset));
  const qs = params.toString();
  return contractsRequest<MaintenanceContractsListResponse>(
    "GET",
    `/maintenance-contracts${qs ? `?${qs}` : ""}`,
  );
}

export function getMaintenanceContract(contractId: string) {
  return contractsRequest<MaintenanceContractResponse>(
    "GET",
    `/maintenance-contracts/${contractId}`,
  );
}

export function createMaintenanceContract(payload: CreateMaintenanceContractPayload) {
  return contractsRequest<MaintenanceContractResponse>("POST", "/maintenance-contracts", payload);
}

export function updateMaintenanceContract(
  contractId: string,
  payload: UpdateMaintenanceContractPayload,
) {
  return contractsRequest<MaintenanceContractResponse>(
    "PATCH",
    `/maintenance-contracts/${contractId}`,
    payload,
  );
}

export function deleteMaintenanceContract(contractId: string) {
  return contractsRequest<{ deleted: true }>("DELETE", `/maintenance-contracts/${contractId}`);
}

export function generateMaintenanceVisit(contractId: string, force?: boolean) {
  return contractsRequest<GenerateMaintenanceVisitResponse>(
    "POST",
    `/maintenance-contracts/${contractId}/generate`,
    force ? { force: true } : {},
  );
}

export function scheduleMaintenanceVisit(
  contractId: string,
  payload: { scheduledStart: string; scheduledEnd: string },
) {
  return contractsRequest<GenerateMaintenanceVisitResponse>(
    "POST",
    `/maintenance-contracts/${contractId}/schedule-visit`,
    payload,
  );
}
