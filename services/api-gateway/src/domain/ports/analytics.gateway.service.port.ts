import type {
  PlatformAnalyticsOverviewResponse,
  PlatformLandingToAppVisitsResponse,
  PlatformLandingVisitsResponse,
  TrackPageviewBody,
  TrackPageviewResponse,
} from "@planwise/shared";

export abstract class AbstractAnalyticsGatewayService {
  abstract trackPageview(body: TrackPageviewBody): Promise<TrackPageviewResponse>;
  abstract getOverview(days?: number): Promise<PlatformAnalyticsOverviewResponse>;
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
}
