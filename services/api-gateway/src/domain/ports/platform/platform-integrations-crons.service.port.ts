import type {
  CronRunsListResponse,
  PlatformCronJobsOverviewResponse,
  PlatformIntegrationsListResponse,
} from "@planwise/shared";

export abstract class AbstractPlatformIntegrationsCronsService {
  abstract listIntegrations(filters?: {
    provider?: string;
    organizationId?: string;
    limit?: number;
    offset?: number;
  }): Promise<PlatformIntegrationsListResponse>;
  abstract getCronJobsOverview(): Promise<PlatformCronJobsOverviewResponse>;
  abstract listCronRuns(filters?: {
    jobKey?: string;
    limit?: number;
    offset?: number;
  }): Promise<CronRunsListResponse>;
}
