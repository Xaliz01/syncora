import type {
  PlatformAnalyticsOverviewResponse,
  PlatformDashboardResponse,
  PlatformLandingToAppVisitsResponse,
  PlatformLandingVisitsResponse,
  PlatformOpsHealthResponse,
} from "@planwise/shared";

export abstract class AbstractPlatformDashboardService {
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
  abstract getDashboard(): Promise<PlatformDashboardResponse>;
  abstract getOpsHealth(): Promise<PlatformOpsHealthResponse>;
}
