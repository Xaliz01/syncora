import { Body, Controller, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import type { TrackPageviewBody, TrackPageviewResponse } from "@planwise/shared";
import { AbstractAnalyticsGatewayService } from "../../domain/ports/analytics.gateway.service.port";
import { resolveClientGeo } from "../../infrastructure/client-geo";

@Controller("analytics")
export class AnalyticsGatewayController {
  constructor(private readonly analyticsGateway: AbstractAnalyticsGatewayService) {}

  @Post("pageview")
  trackPageview(
    @Body() body: TrackPageviewBody,
    @Req() req: Request,
  ): Promise<TrackPageviewResponse> {
    const geo = resolveClientGeo(req);
    // Ne jamais faire confiance à country/region envoyés par le client.
    return this.analyticsGateway.trackPageview({
      surface: body.surface,
      path: body.path,
      visitorId: body.visitorId,
      sessionId: body.sessionId,
      ...(body.referrerHost !== undefined ? { referrerHost: body.referrerHost } : {}),
      ...(body.authenticated !== undefined ? { authenticated: body.authenticated } : {}),
      ...(geo.country ? { country: geo.country } : {}),
      ...(geo.region ? { region: geo.region } : {}),
    });
  }
}
