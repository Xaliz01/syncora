import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
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
import { AbstractUsersService } from "../users/ports/users.service.port";
import { AbstractOrganizationsService } from "../organizations/ports/organizations.service.port";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";

@Injectable()
export class PlatformDashboardService extends AbstractPlatformDashboardService {
  private readonly logger = new Logger(PlatformDashboardService.name);

  constructor(
    private readonly analyticsGateway: AbstractAnalyticsGatewayService,
    private readonly prometheusOpsHealth: AbstractPrometheusOpsHealthService,
    private readonly orgLookup: AbstractPlatformOrgLookupService,
    private readonly users: AbstractUsersService,
    private readonly organizations: AbstractOrganizationsService,
    private readonly subscriptions: SubscriptionsService,
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
        this.users.listOrganizationIdsWithExcludedEmails().catch((err: unknown) => {
          this.logger.warn(
            `platform dashboard: excluded-organization-ids unavailable: ${(err as Error).message}`,
          );
          return [] as string[];
        }),
        this.users.getPlatformDashboardStats(),
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

      const orgStats = await this.organizations.getPlatformDashboardStats(
        userExcludedOrgIds.length > 0
          ? { extraExcludeOrganizationIds: userExcludedOrgIds }
          : undefined,
      );

      const subCounts = await this.subscriptions.getPlatformDashboardCounts(
        orgStats.excludedOrganizationIds.length > 0
          ? { excludeOrganizationIds: orgStats.excludedOrganizationIds }
          : undefined,
      );

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
