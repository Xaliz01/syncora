import { BadRequestException, Injectable } from "@nestjs/common";
import type {
  CronRunResponse,
  CronRunsListResponse,
  PlatformCronJobsOverviewResponse,
  PlatformIntegrationsListResponse,
} from "@planwise/shared";
import { PLATFORM_CRON_JOBS } from "@planwise/shared";
import { AbstractPlatformIntegrationsCronsService } from "../ports/platform/platform-integrations-crons.service.port";
import { AbstractPlatformOrgLookupService } from "../ports/platform/platform-org-lookup.service.port";
import { AbstractIntegrationsService } from "../integrations/ports/integrations.service.port";
import { CronRunRecorder as OrganizationsCronRunRecorder } from "../organizations/cron-run.recorder";
import { CronRunRecorder as NotificationsCronRunRecorder } from "../notifications/cron-run.recorder";
import { CronRunRecorder as CasesCronRunRecorder } from "../cases/cron-run.recorder";
import { CronRunRecorder as IntegrationsCronRunRecorder } from "../integrations/cron-run.recorder";

type CronRecorder = {
  list(filters?: {
    jobKey?: string;
    limit?: number;
    offset?: number;
  }): Promise<CronRunsListResponse>;
  getLatest(jobKey: string): Promise<CronRunResponse | null>;
};

@Injectable()
export class PlatformIntegrationsCronsService extends AbstractPlatformIntegrationsCronsService {
  constructor(
    private readonly orgLookup: AbstractPlatformOrgLookupService,
    private readonly integrations: AbstractIntegrationsService,
    private readonly organizationsCrons: OrganizationsCronRunRecorder,
    private readonly notificationsCrons: NotificationsCronRunRecorder,
    private readonly casesCrons: CasesCronRunRecorder,
    private readonly integrationsCrons: IntegrationsCronRunRecorder,
  ) {
    super();
  }

  async listIntegrations(filters?: {
    provider?: string;
    organizationId?: string;
    limit?: number;
    offset?: number;
  }): Promise<PlatformIntegrationsListResponse> {
    const res = await this.integrations.listPlatformIntegrations(filters);
    const orgIds = [...new Set(res.integrations.map((i) => i.organizationId))];
    const orgNames = await this.orgLookup.resolveOrganizationNames(orgIds);
    return {
      total: res.total,
      integrations: res.integrations.map((i) => ({
        ...i,
        organizationName: orgNames[i.organizationId],
        authMethod:
          i.authMethod === "oauth" || i.authMethod === "api_token" ? i.authMethod : undefined,
      })),
    };
  }

  async getCronJobsOverview(): Promise<PlatformCronJobsOverviewResponse> {
    const jobs = await Promise.all(
      PLATFORM_CRON_JOBS.map(async (def) => {
        let lastRun: CronRunResponse | undefined;
        try {
          const latest = await this.recorderFor(def.service).getLatest(def.jobKey);
          lastRun = latest ?? undefined;
        } catch {
          lastRun = undefined;
        }
        return { ...def, lastRun };
      }),
    );
    return { jobs };
  }

  async listCronRuns(filters?: {
    jobKey?: string;
    limit?: number;
    offset?: number;
  }): Promise<CronRunsListResponse> {
    const jobKey = filters?.jobKey?.trim();
    if (jobKey) {
      const def = PLATFORM_CRON_JOBS.find((j) => j.jobKey === jobKey);
      if (!def) {
        throw new BadRequestException(`Job inconnu : ${jobKey}`);
      }
      return this.recorderFor(def.jobKey).list({
        jobKey,
        limit: filters?.limit,
        offset: filters?.offset,
      });
    }

    const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 200);
    const offset = Math.max(filters?.offset ?? 0, 0);
    const fetchLimit = Math.min(offset + limit, 200);

    const batches = await Promise.all(
      PLATFORM_CRON_JOBS.map(async (def) => {
        try {
          return await this.recorderFor(def.jobKey).list({
            jobKey: def.jobKey,
            limit: fetchLimit,
            offset: 0,
          });
        } catch {
          return { runs: [] as CronRunResponse[], total: 0 };
        }
      }),
    );

    const total = batches.reduce((sum, b) => sum + b.total, 0);
    const runs = batches
      .flatMap((b) => b.runs)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .slice(offset, offset + limit);

    return { runs, total };
  }

  private recorderFor(jobKey: string): CronRecorder {
    if (jobKey.startsWith("notifications.")) return this.notificationsCrons;
    if (jobKey.startsWith("cases.")) return this.casesCrons;
    if (jobKey.startsWith("integrations.")) return this.integrationsCrons;
    return this.organizationsCrons;
  }
}
