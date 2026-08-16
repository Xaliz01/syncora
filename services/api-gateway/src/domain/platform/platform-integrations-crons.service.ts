import { BadRequestException, Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  CronRunResponse,
  CronRunsListResponse,
  PlatformCronJobsOverviewResponse,
  PlatformIntegrationsListResponse,
} from "@planwise/shared";
import { PLATFORM_CRON_JOBS } from "@planwise/shared";
import { AbstractPlatformIntegrationsCronsService } from "../ports/platform/platform-integrations-crons.service.port";
import { AbstractPlatformOrgLookupService } from "../ports/platform/platform-org-lookup.service.port";
import { SERVICE_URLS } from "../../infrastructure/service-urls.config";

@Injectable()
export class PlatformIntegrationsCronsService extends AbstractPlatformIntegrationsCronsService {
  constructor(
    private readonly httpService: HttpService,
    private readonly orgLookup: AbstractPlatformOrgLookupService,
  ) {
    super();
  }

  async listIntegrations(filters?: {
    provider?: string;
    organizationId?: string;
    limit?: number;
    offset?: number;
  }): Promise<PlatformIntegrationsListResponse> {
    const params: Record<string, string | number> = {};
    if (filters?.provider?.trim()) params.provider = filters.provider.trim();
    if (filters?.organizationId?.trim()) params.organizationId = filters.organizationId.trim();
    if (filters?.limit != null) params.limit = filters.limit;
    if (filters?.offset != null) params.offset = filters.offset;

    const res = await firstValueFrom(
      this.httpService.get<PlatformIntegrationsListResponse>(
        `${SERVICE_URLS.integrations}/platform/integrations`,
        { params },
      ),
    );

    const orgIds = [...new Set(res.data.integrations.map((i) => i.organizationId))];
    const orgNames = await this.orgLookup.resolveOrganizationNames(orgIds);
    return {
      total: res.data.total,
      integrations: res.data.integrations.map((i) => ({
        ...i,
        organizationName: orgNames[i.organizationId],
      })),
    };
  }

  async getCronJobsOverview(): Promise<PlatformCronJobsOverviewResponse> {
    const jobs = await Promise.all(
      PLATFORM_CRON_JOBS.map(async (def) => {
        const baseUrl = this.cronServiceBaseUrl(def.service);
        let lastRun: CronRunResponse | undefined;
        try {
          const res = await firstValueFrom(
            this.httpService.get<CronRunResponse | "">(`${baseUrl}/platform/cron-runs/latest`, {
              params: { jobKey: def.jobKey },
            }),
          );
          lastRun = res.data && typeof res.data === "object" ? res.data : undefined;
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
      const res = await firstValueFrom(
        this.httpService.get<CronRunsListResponse>(
          `${this.cronServiceBaseUrl(def.service)}/platform/cron-runs`,
          {
            params: {
              jobKey,
              limit: filters?.limit,
              offset: filters?.offset,
            },
          },
        ),
      );
      return res.data;
    }

    // Sans filtre : fusionne les runs de chaque service (triés par startedAt desc).
    const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 200);
    const offset = Math.max(filters?.offset ?? 0, 0);
    // Assez d’éléments par source pour couvrir la page demandée après merge.
    const fetchLimit = Math.min(offset + limit, 200);

    const batches = await Promise.all(
      PLATFORM_CRON_JOBS.map(async (def) => {
        try {
          const res = await firstValueFrom(
            this.httpService.get<CronRunsListResponse>(
              `${this.cronServiceBaseUrl(def.service)}/platform/cron-runs`,
              { params: { jobKey: def.jobKey, limit: fetchLimit, offset: 0 } },
            ),
          );
          return { runs: res.data.runs, total: res.data.total };
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

  cronServiceBaseUrl(service: (typeof PLATFORM_CRON_JOBS)[number]["service"]): string {
    switch (service) {
      case "integrations-service":
        return SERVICE_URLS.integrations;
      case "notifications-service":
        return SERVICE_URLS.notifications;
      case "organizations-service":
        return SERVICE_URLS.organizations;
      case "cases-service":
        return SERVICE_URLS.cases;
      default:
        return SERVICE_URLS.organizations;
    }
  }
}
