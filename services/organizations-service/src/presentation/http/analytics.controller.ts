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

  @Get("platform/analytics/landing-visits")
  listLandingVisits(
    @Query("days") days?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.analyticsService.listLandingVisits({
      days: days ? Number.parseInt(days, 10) : undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
      offset: offset ? Number.parseInt(offset, 10) : undefined,
    });
  }

  @Get("platform/analytics/landing-to-app-visits")
  listLandingToAppVisits(
    @Query("days") days?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.analyticsService.listLandingToAppVisits({
      days: days ? Number.parseInt(days, 10) : undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
      offset: offset ? Number.parseInt(offset, 10) : undefined,
    });
  }
}
