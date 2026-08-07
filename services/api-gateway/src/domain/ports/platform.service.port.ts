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
  PlatformProspectEmailNotFoundBody,
  PlatformProspectNoteBody,
  PlatformProspectManualCreateBody,
  PlatformProspectOutreachBody,
  PlatformProspectOutreachResponse,
  PlatformProspectsSearchResponse,
  PlatformProspectSearchSort,
  ProspectOutreachStatus,
  ProspectOutreachesListResponse,
  PlatformUsersListResponse,
  StartImpersonationBody,
  PlatformAnalyticsOverviewResponse,
  PlatformLandingToAppVisitsResponse,
  PlatformLandingVisitsResponse,
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
  abstract listLandingVisits(options?: {
    days?: number;
    limit?: number;
    offset?: number;
  }): Promise<PlatformLandingVisitsResponse>;
  abstract listLandingToAppVisits(options?: {
    days?: number;
    limit?: number;
    offset?: number;
  }): Promise<PlatformLandingToAppVisitsResponse>;
  abstract searchProspects(filters?: {
    page?: number;
    perPage?: number;
    departement?: string;
    codeNaf?: string;
    preset?: string;
    sort?: PlatformProspectSearchSort;
    /** Date de création min (YYYY-MM-DD ou JJ-MM-AAAA). Défaut : il y a 365 jours. */
    dateCreationMin?: string;
    refresh?: boolean;
  }): Promise<PlatformProspectsSearchResponse>;
  /** Fiche unique Pappers par SIRET (14) ou SIREN (9). */
  abstract lookupProspectBySiret(siret: string): Promise<PlatformProspectsSearchResponse>;
  abstract getProspectCredits(): Promise<PlatformProspectCreditsResponse>;
  abstract listTrackedProspects(options?: {
    limit?: number;
    offset?: number;
    status?: ProspectOutreachStatus;
    search?: string;
  }): Promise<ProspectOutreachesListResponse>;
  abstract sendProspectOutreach(
    staff: PlatformAuthUser,
    body: PlatformProspectOutreachBody,
  ): Promise<PlatformProspectOutreachResponse>;
  abstract markProspectEmailNotFound(
    staff: PlatformAuthUser,
    body: PlatformProspectEmailNotFoundBody,
  ): Promise<{ ok: true }>;
  abstract saveProspectNote(
    staff: PlatformAuthUser,
    body: PlatformProspectNoteBody,
  ): Promise<{ ok: true; comment?: string }>;
  abstract createManualProspect(
    staff: PlatformAuthUser,
    body: PlatformProspectManualCreateBody,
  ): Promise<{ ok: true }>;
}
