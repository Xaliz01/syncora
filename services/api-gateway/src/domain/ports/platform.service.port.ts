import type {
  AuthResponse,
  CronRunsListResponse,
  LoginBody,
  PlatformAuthResponse,
  PlatformAuthUser,
  PlatformCronJobsOverviewResponse,
  PlatformIntegrationsListResponse,
  PlatformOrganizationDetailResponse,
  PlatformOrganizationsListResponse,
  PlatformProspectCreditsResponse,
  PlatformProspectOutreachBody,
  PlatformProspectOutreachResponse,
  PlatformProspectsSearchResponse,
  PlatformUsersListResponse,
  StartImpersonationBody,
  PlatformAnalyticsOverviewResponse,
} from "@planwise/shared";

export abstract class AbstractPlatformService {
  abstract login(body: LoginBody): Promise<PlatformAuthResponse>;
  abstract getMe(user: PlatformAuthUser): Promise<PlatformAuthUser>;
  abstract listOrganizations(filters?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<PlatformOrganizationsListResponse>;
  abstract getOrganization(organizationId: string): Promise<PlatformOrganizationDetailResponse>;
  abstract staffExtendOrganizationTrial(
    organizationId: string,
  ): Promise<PlatformOrganizationDetailResponse["subscription"]>;
  abstract listUsers(filters?: {
    search?: string;
    organizationId?: string;
    limit?: number;
    offset?: number;
  }): Promise<PlatformUsersListResponse>;
  abstract startImpersonation(
    staff: PlatformAuthUser,
    body: StartImpersonationBody,
  ): Promise<AuthResponse>;
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
  abstract getAnalyticsOverview(days?: number): Promise<PlatformAnalyticsOverviewResponse>;
  abstract searchProspects(filters?: {
    page?: number;
    perPage?: number;
    departement?: string;
    codeNaf?: string;
    preset?: string;
  }): Promise<PlatformProspectsSearchResponse>;
  abstract getProspectCredits(): Promise<PlatformProspectCreditsResponse>;
  abstract sendProspectOutreach(
    staff: PlatformAuthUser,
    body: PlatformProspectOutreachBody,
  ): Promise<PlatformProspectOutreachResponse>;
}
