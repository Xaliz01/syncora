import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import type { TrackPageviewBody } from "@planwise/shared";
import { AbstractAnalyticsService } from "../../domain/ports/analytics.service.port";

@Controller()
export class AnalyticsController {
  constructor(private readonly analyticsService: AbstractAnalyticsService) {}

  @Post("analytics/pageviews")
  trackPageview(@Body() body: TrackPageviewBody) {
    return this.analyticsService.trackPageview(body);
  }

  @Get("platform/analytics/overview")
  getOverview(@Query("days") days?: string) {
    return this.analyticsService.getOverview(days ? Number.parseInt(days, 10) : undefined);
  }
}
