import { Injectable } from "@nestjs/common";
import type { AuthUser } from "@planwise/shared";
import {
  AbstractMaintenanceContractsGatewayService,
  type CreateMaintenanceContractForOrgBody,
  type ScheduleMaintenanceVisitForOrgBody,
  type UpdateMaintenanceContractForOrgBody,
} from "./ports/maintenance-contracts.service.port";
import { AbstractCustomersGatewayService } from "./ports/customers.service.port";
import { MaintenanceContractsService } from "./cases/maintenance-contracts.service";

@Injectable()
export class MaintenanceContractsGatewayService extends AbstractMaintenanceContractsGatewayService {
  constructor(
    private readonly contractsService: MaintenanceContractsService,
    private readonly customersGateway: AbstractCustomersGatewayService,
  ) {
    super();
  }

  async create(user: AuthUser, body: CreateMaintenanceContractForOrgBody) {
    await this.customersGateway.getCustomer(user, body.customerId);
    return this.contractsService.create({
      organizationId: user.organizationId,
      ...body,
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
    return this.contractsService.list(user.organizationId, filters);
  }

  async get(user: AuthUser, contractId: string) {
    return this.contractsService.get(user.organizationId, contractId);
  }

  async update(user: AuthUser, contractId: string, body: UpdateMaintenanceContractForOrgBody) {
    if (body.customerId) {
      await this.customersGateway.getCustomer(user, body.customerId);
    }
    return this.contractsService.update(contractId, {
      organizationId: user.organizationId,
      ...body,
    });
  }

  async remove(user: AuthUser, contractId: string) {
    return this.contractsService.remove(user.organizationId, contractId);
  }

  async generate(user: AuthUser, contractId: string, body?: { force?: boolean }) {
    return this.contractsService.generateVisit(user.organizationId, contractId, body);
  }

  async scheduleVisit(
    user: AuthUser,
    contractId: string,
    body: ScheduleMaintenanceVisitForOrgBody,
  ) {
    return this.contractsService.generateVisit(user.organizationId, contractId, {
      scheduledStart: body.scheduledStart,
      scheduledEnd: body.scheduledEnd,
    });
  }
}
