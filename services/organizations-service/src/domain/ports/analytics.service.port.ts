import type {
  PlatformAnalyticsOverviewResponse,
  PlatformLandingVisitsResponse,
  TrackPageviewBody,
  TrackPageviewResponse,
} from "@planwise/shared";

export abstract class AbstractAnalyticsService {
  abstract trackPageview(body: TrackPageviewBody): Promise<TrackPageviewResponse>;
  abstract getOverview(days?: number): Promise<PlatformAnalyticsOverviewResponse>;
  abstract listLandingVisits(options?: {
    days?: number;
    limit?: number;
    offset?: number;
  }): Promise<PlatformLandingVisitsResponse>;
}
