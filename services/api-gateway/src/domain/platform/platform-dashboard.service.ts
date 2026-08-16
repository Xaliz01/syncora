import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  PlatformAnalyticsOverviewResponse,
  PlatformDashboardResponse,
  PlatformLandingToAppVisitsResponse,
  PlatformLandingVisitsResponse,
  PlatformOpsHealthResponse,
} from "@planwise/shared";
import { AbstractAnalyticsGatewayService } from "../ports/analytics.gateway.service.port";
import { AbstractPlatformDashboardService } from "../ports/platform/platform-dashboard.service.port";
import { AbstractPlatformOrgLookupService } from "../ports/platform/platform-org-lookup.service.port";
import { AbstractPrometheusOpsHealthService } from "../ports/platform/prometheus-ops-health.service.port";
import { SERVICE_URLS } from "../../infrastructure/service-urls.config";

@Injectable()
export class PlatformDashboardService extends AbstractPlatformDashboardService {
  private readonly logger = new Logger(PlatformDashboardService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly analyticsGateway: AbstractAnalyticsGatewayService,
    private readonly prometheusOpsHealth: AbstractPrometheusOpsHealthService,
    private readonly orgLookup: AbstractPlatformOrgLookupService,
  ) {
    super();
  }

  getAnalyticsOverview(days?: number): Promise<PlatformAnalyticsOverviewResponse> {
    return this.analyticsGateway.getOverview(days);
  }

  listLandingVisits(options?: {
    days?: number;
    limit?: number;
    offset?: number;
  }): Promise<PlatformLandingVisitsResponse> {
    return this.analyticsGateway.listLandingVisits(options);
  }

  listLandingToAppVisits(options?: {
    days?: number;
    limit?: number;
    offset?: number;
  }): Promise<PlatformLandingToAppVisitsResponse> {
    return this.analyticsGateway.listLandingToAppVisits(options);
  }

  getOpsHealth(): Promise<PlatformOpsHealthResponse> {
    return this.prometheusOpsHealth.getOpsHealth();
  }

  async getDashboard(): Promise<PlatformDashboardResponse> {
    try {
      const visitLimit = 10;
      const visitDays = 90;

      const [userExcludedOrgIds, userStats, landing, login, register] = await Promise.all([
        firstValueFrom(
          this.httpService.get<string[]>(
            `${SERVICE_URLS.users}/users/platform/excluded-organization-ids`,
            { timeout: 10000 },
          ),
        )
          .then((r) => r.data)
          .catch((err: unknown) => {
            this.logger.warn(
              `platform dashboard: excluded-organization-ids unavailable: ${(err as Error).message}`,
            );
            return [] as string[];
          }),
        firstValueFrom(
          this.httpService.get<{
            userCount: number;
            connectedUserCount: number;
            recentLogins: Array<{
              userId: string;
              email: string;
              name?: string;
              organizationId?: string;
              lastLoginAt: string;
            }>;
          }>(`${SERVICE_URLS.users}/users/platform/dashboard-stats`, {
            timeout: 10000,
          }),
        ).then((r) => r.data),
        this.analyticsGateway.listPathVisits({
          surface: "marketing",
          path: "/",
          limit: visitLimit,
          days: visitDays,
        }),
        this.analyticsGateway.listPathVisits({
          surface: "app",
          path: "/login",
          limit: visitLimit,
          days: visitDays,
        }),
        this.analyticsGateway.listPathVisits({
          surface: "app",
          path: "/register",
          limit: visitLimit,
          days: visitDays,
        }),
      ]);

      const orgStats = await firstValueFrom(
        this.httpService.get<{
          organizationCount: number;
          excludedOrganizationIds: string[];
        }>(`${SERVICE_URLS.organizations}/organizations/platform/dashboard-stats`, {
          params:
            userExcludedOrgIds.length > 0
              ? { extraExcludeOrganizationIds: userExcludedOrgIds.join(",") }
              : {},
          timeout: 10000,
        }),
      ).then((r) => r.data);

      const excludeQs = orgStats.excludedOrganizationIds.join(",");
      const subCounts = await firstValueFrom(
        this.httpService.get<{ activeTrialCount: number; subscriberCount: number }>(
          `${SERVICE_URLS.subscriptions}/subscriptions/platform/dashboard-counts`,
          {
            params: excludeQs ? { excludeOrganizationIds: excludeQs } : {},
            timeout: 10000,
          },
        ),
      ).then((r) => r.data);

      const recentLoginOrgIds = [
        ...new Set(
          (userStats.recentLogins ?? [])
            .map((login) => login.organizationId)
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      const orgNames = await this.orgLookup.resolveOrganizationNames(recentLoginOrgIds);
      const recentLogins = (userStats.recentLogins ?? []).map((login) => ({
        ...login,
        organizationName: login.organizationId ? orgNames[login.organizationId] : undefined,
      }));

      return {
        organizationCount: orgStats.organizationCount,
        userCount: userStats.userCount,
        connectedUserCount: userStats.connectedUserCount,
        activeTrialCount: subCounts.activeTrialCount,
        subscriberCount: subCounts.subscriberCount,
        recentLogins,
        recentLandingVisits: landing.items,
        recentLoginVisits: login.items,
        recentRegisterVisits: register.items,
      };
    } catch (err: unknown) {
      this.logger.warn(`platform dashboard failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException("Tableau de bord temporairement indisponible");
    }
  }
}
