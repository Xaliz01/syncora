import { Injectable } from "@nestjs/common";
import type { AuthUser } from "@planwise/shared";
import type {
  GenerateMaintenanceVisitResponse,
  MaintenanceContractResponse,
  MaintenanceContractsListResponse,
} from "@planwise/shared";
import { OrganizationScopedHttpClient } from "../infrastructure/organization-scoped-http.client";
import {
  AbstractMaintenanceContractsGatewayService,
  type CreateMaintenanceContractForOrgBody,
  type ScheduleMaintenanceVisitForOrgBody,
  type UpdateMaintenanceContractForOrgBody,
} from "./ports/maintenance-contracts.service.port";
import { AbstractCustomersGatewayService } from "./ports/customers.service.port";
import { SERVICE_URLS } from "../infrastructure/service-urls.config";

@Injectable()
export class MaintenanceContractsGatewayService extends AbstractMaintenanceContractsGatewayService {
  constructor(
    private readonly scopedHttp: OrganizationScopedHttpClient,
    private readonly customersGateway: AbstractCustomersGatewayService,
  ) {
    super();
  }

  async create(user: AuthUser, body: CreateMaintenanceContractForOrgBody) {
    await this.customersGateway.getCustomer(user, body.customerId);
    return this.scopedHttp.request<MaintenanceContractResponse>({
      baseUrl: SERVICE_URLS.cases,
      organizationId: user.organizationId,
      method: "post",
      path: "/maintenance-contracts",
      body: { ...body },
      errorLabel: "Contracts service error",
    });
  }

  async list(
    user: AuthUser,
    filters?: {
      customerId?: string;
      status?: string;
      dueBefore?: string;
      toSchedule?: boolean;
      limit?: number;
      offset?: number;
    },
  ) {
    return this.scopedHttp.request<MaintenanceContractsListResponse>({
      baseUrl: SERVICE_URLS.cases,
      organizationId: user.organizationId,
      method: "get",
      path: "/maintenance-contracts",
      query: {
        ...filters,
        toSchedule: filters?.toSchedule ? "true" : undefined,
      },
      errorLabel: "Contracts service error",
    });
  }

  async get(user: AuthUser, contractId: string) {
    return this.scopedHttp.request<MaintenanceContractResponse>({
      baseUrl: SERVICE_URLS.cases,
      organizationId: user.organizationId,
      method: "get",
      path: `/maintenance-contracts/${contractId}`,
      errorLabel: "Contracts service error",
    });
  }

  async update(user: AuthUser, contractId: string, body: UpdateMaintenanceContractForOrgBody) {
    if (body.customerId) {
      await this.customersGateway.getCustomer(user, body.customerId);
    }
    return this.scopedHttp.request<MaintenanceContractResponse>({
      baseUrl: SERVICE_URLS.cases,
      organizationId: user.organizationId,
      method: "patch",
      path: `/maintenance-contracts/${contractId}`,
      body: { ...body },
      errorLabel: "Contracts service error",
    });
  }

  async remove(user: AuthUser, contractId: string) {
    return this.scopedHttp.request<{ deleted: true }>({
      baseUrl: SERVICE_URLS.cases,
      organizationId: user.organizationId,
      method: "delete",
      path: `/maintenance-contracts/${contractId}`,
      errorLabel: "Contracts service error",
    });
  }

  async generate(user: AuthUser, contractId: string, body?: { force?: boolean }) {
    return this.scopedHttp.request<GenerateMaintenanceVisitResponse>({
      baseUrl: SERVICE_URLS.cases,
      organizationId: user.organizationId,
      method: "post",
      path: `/maintenance-contracts/${contractId}/generate`,
      body: body ?? {},
      errorLabel: "Contracts service error",
    });
  }

  async scheduleVisit(
    user: AuthUser,
    contractId: string,
    body: ScheduleMaintenanceVisitForOrgBody,
  ) {
    return this.scopedHttp.request<GenerateMaintenanceVisitResponse>({
      baseUrl: SERVICE_URLS.cases,
      organizationId: user.organizationId,
      method: "post",
      path: `/maintenance-contracts/${contractId}/schedule-visit`,
      body: { ...body },
      errorLabel: "Contracts service error",
    });
  }
}
