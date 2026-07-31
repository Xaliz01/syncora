import type {
  PlatformAnalyticsOverviewResponse,
  TrackPageviewBody,
  TrackPageviewResponse,
} from "@planwise/shared";

export abstract class AbstractAnalyticsGatewayService {
  abstract trackPageview(body: TrackPageviewBody): Promise<TrackPageviewResponse>;
  abstract getOverview(days?: number): Promise<PlatformAnalyticsOverviewResponse>;
}
