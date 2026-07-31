import type {
  PlatformAnalyticsOverviewResponse,
  TrackPageviewBody,
  TrackPageviewResponse,
} from "@planwise/shared";

export abstract class AbstractAnalyticsService {
  abstract trackPageview(body: TrackPageviewBody): Promise<TrackPageviewResponse>;
  abstract getOverview(days?: number): Promise<PlatformAnalyticsOverviewResponse>;
}
