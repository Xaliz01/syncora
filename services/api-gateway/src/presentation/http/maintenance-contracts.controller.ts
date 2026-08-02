import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { parsePaginationQueryParams } from "@planwise/shared";
import type { AuthUser } from "@planwise/shared";
import { AbstractMaintenanceContractsGatewayService } from "../../domain/ports/maintenance-contracts.service.port";
import type {
  CreateMaintenanceContractForOrgBody,
  ScheduleMaintenanceVisitForOrgBody,
  UpdateMaintenanceContractForOrgBody,
} from "../../domain/ports/maintenance-contracts.service.port";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import {
  RequirePermissionGuard,
  RequirePermissions,
} from "../../infrastructure/require-permission.guard";
import { SubscriptionAccessGuard } from "../../infrastructure/subscription-access.guard";
import { CurrentUser } from "../../infrastructure/current-user.decorator";

@Controller("maintenance-contracts")
@UseGuards(JwtAuthGuard, SubscriptionAccessGuard, RequirePermissionGuard)
export class MaintenanceContractsController {
  constructor(private readonly contractsService: AbstractMaintenanceContractsGatewayService) {}

  @Post()
  @RequirePermissions("contracts.create")
  create(@CurrentUser() user: AuthUser, @Body() body: CreateMaintenanceContractForOrgBody) {
    return this.contractsService.create(user, body);
  }

  @Get()
  @RequirePermissions("contracts.read")
  list(
    @CurrentUser() user: AuthUser,
    @Query("customerId") customerId?: string,
    @Query("status") status?: string,
    @Query("dueBefore") dueBefore?: string,
    @Query("toSchedule") toSchedule?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    const pagination = parsePaginationQueryParams(limit, offset);
    return this.contractsService.list(user, {
      customerId,
      status,
      dueBefore,
      toSchedule: toSchedule === "true" || toSchedule === "1",
      ...pagination,
    });
  }

  @Get(":contractId")
  @RequirePermissions("contracts.read")
  get(@CurrentUser() user: AuthUser, @Param("contractId") contractId: string) {
    return this.contractsService.get(user, contractId);
  }

  @Patch(":contractId")
  @RequirePermissions("contracts.update")
  update(
    @CurrentUser() user: AuthUser,
    @Param("contractId") contractId: string,
    @Body() body: UpdateMaintenanceContractForOrgBody,
  ) {
    return this.contractsService.update(user, contractId, body);
  }

  @Delete(":contractId")
  @RequirePermissions("contracts.delete")
  remove(@CurrentUser() user: AuthUser, @Param("contractId") contractId: string) {
    return this.contractsService.remove(user, contractId);
  }

  @Post(":contractId/generate")
  @RequirePermissions("contracts.update")
  generate(
    @CurrentUser() user: AuthUser,
    @Param("contractId") contractId: string,
    @Body() body?: { force?: boolean },
  ) {
    return this.contractsService.generate(user, contractId, body);
  }

  @Post(":contractId/schedule-visit")
  @RequirePermissions("contracts.update")
  scheduleVisit(
    @CurrentUser() user: AuthUser,
    @Param("contractId") contractId: string,
    @Body() body: ScheduleMaintenanceVisitForOrgBody,
  ) {
    return this.contractsService.scheduleVisit(user, contractId, body);
  }
}
