import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import {
  parsePaginationQueryParams,
  type CreateMaintenanceContractBody,
  type ScheduleMaintenanceVisitBody,
  type UpdateMaintenanceContractBody,
} from "@planwise/shared";
import { parseOrganizationIdBody, parseOrganizationIdQuery } from "@planwise/shared/nest";
import { MaintenanceContractsService } from "../../domain/maintenance-contracts.service";
import { CronRunRecorder } from "../../domain/cron-run.recorder";

@Controller("maintenance-contracts")
export class MaintenanceContractsController {
  constructor(private readonly contractsService: MaintenanceContractsService) {}

  @Post()
  async create(@Body() body: CreateMaintenanceContractBody) {
    body.organizationId = parseOrganizationIdBody(body.organizationId);
    return this.contractsService.create(body);
  }

  @Get()
  async list(
    @Query("organizationId") organizationId: string,
    @Query("customerId") customerId?: string,
    @Query("status") status?: string,
    @Query("dueBefore") dueBefore?: string,
    @Query("toSchedule") toSchedule?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    const pagination = parsePaginationQueryParams(limit, offset);
    return this.contractsService.list(organizationId, {
      customerId,
      status,
      dueBefore,
      toSchedule: toSchedule === "true" || toSchedule === "1",
      ...pagination,
    });
  }

  /** Candidats multi-org pour le scheduler de notifications (avant :contractId). */
  @Get("reminder-candidates")
  async listReminderCandidates() {
    return this.contractsService.listReminderCandidates();
  }

  @Get("visits-to-schedule")
  async listVisitsToSchedule(@Query("organizationId") organizationId: string) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.contractsService.listVisitsToSchedule(organizationId);
  }

  @Get(":contractId")
  async get(
    @Query("organizationId") organizationId: string,
    @Param("contractId") contractId: string,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.contractsService.get(organizationId, contractId);
  }

  @Patch(":contractId")
  async update(
    @Param("contractId") contractId: string,
    @Body() body: UpdateMaintenanceContractBody,
  ) {
    body.organizationId = parseOrganizationIdBody(body.organizationId);
    return this.contractsService.update(contractId, body);
  }

  @Delete(":contractId")
  async remove(
    @Query("organizationId") organizationId: string,
    @Param("contractId") contractId: string,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.contractsService.remove(organizationId, contractId);
  }

  @Post(":contractId/generate")
  async generate(
    @Query("organizationId") organizationId: string,
    @Param("contractId") contractId: string,
    @Body() body?: { force?: boolean },
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.contractsService.generateVisit(organizationId, contractId, {
      force: body?.force === true,
    });
  }

  @Post(":contractId/schedule-visit")
  async scheduleVisit(
    @Param("contractId") contractId: string,
    @Body() body: ScheduleMaintenanceVisitBody,
  ) {
    body.organizationId = parseOrganizationIdBody(body.organizationId);
    return this.contractsService.generateVisit(body.organizationId, contractId, {
      scheduledStart: body.scheduledStart,
      scheduledEnd: body.scheduledEnd,
    });
  }

  @Post(":contractId/mark-reminded")
  async markReminded(
    @Query("organizationId") organizationId: string,
    @Param("contractId") contractId: string,
  ) {
    organizationId = parseOrganizationIdQuery(organizationId);
    return this.contractsService.markReminded(organizationId, contractId);
  }
}

@Controller("platform")
export class CasesPlatformOpsController {
  constructor(private readonly cronRunRecorder: CronRunRecorder) {}

  @Get("cron-runs")
  listCronRuns(
    @Query("jobKey") jobKey?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.cronRunRecorder.list({
      jobKey,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
      offset: offset ? Number.parseInt(offset, 10) : undefined,
    });
  }

  @Get("cron-runs/latest")
  getLatestCronRun(@Query("jobKey") jobKey: string) {
    return this.cronRunRecorder.getLatest(jobKey);
  }
}
