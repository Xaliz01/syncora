import { Body, Controller, Post } from "@nestjs/common";
import type { TrackPageviewBody, TrackPageviewResponse } from "@planwise/shared";
import { AbstractAnalyticsGatewayService } from "../../domain/ports/analytics.gateway.service.port";

@Controller("analytics")
export class AnalyticsGatewayController {
  constructor(private readonly analyticsGateway: AbstractAnalyticsGatewayService) {}

  @Post("pageview")
  trackPageview(@Body() body: TrackPageviewBody): Promise<TrackPageviewResponse> {
    return this.analyticsGateway.trackPageview(body);
  }
}
