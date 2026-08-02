import type { AuthUser } from "@planwise/shared";
import type {
  CreateMaintenanceContractBody,
  GenerateMaintenanceVisitResponse,
  MaintenanceContractResponse,
  MaintenanceContractsListResponse,
  ScheduleMaintenanceVisitBody,
  UpdateMaintenanceContractBody,
} from "@planwise/shared";

export type CreateMaintenanceContractForOrgBody = Omit<
  CreateMaintenanceContractBody,
  "organizationId"
>;

export type UpdateMaintenanceContractForOrgBody = Omit<
  UpdateMaintenanceContractBody,
  "organizationId"
>;

export type ScheduleMaintenanceVisitForOrgBody = Omit<
  ScheduleMaintenanceVisitBody,
  "organizationId"
>;

export abstract class AbstractMaintenanceContractsGatewayService {
  abstract create(
    user: AuthUser,
    body: CreateMaintenanceContractForOrgBody,
  ): Promise<MaintenanceContractResponse>;

  abstract list(
    user: AuthUser,
    filters?: {
      customerId?: string;
      status?: string;
      dueBefore?: string;
      toSchedule?: boolean;
      limit?: number;
      offset?: number;
    },
  ): Promise<MaintenanceContractsListResponse>;

  abstract get(user: AuthUser, contractId: string): Promise<MaintenanceContractResponse>;

  abstract update(
    user: AuthUser,
    contractId: string,
    body: UpdateMaintenanceContractForOrgBody,
  ): Promise<MaintenanceContractResponse>;

  abstract remove(user: AuthUser, contractId: string): Promise<{ deleted: true }>;

  abstract generate(
    user: AuthUser,
    contractId: string,
    body?: { force?: boolean },
  ): Promise<GenerateMaintenanceVisitResponse>;

  abstract scheduleVisit(
    user: AuthUser,
    contractId: string,
    body: ScheduleMaintenanceVisitForOrgBody,
  ): Promise<GenerateMaintenanceVisitResponse>;
}
