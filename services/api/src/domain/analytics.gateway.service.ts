import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import type {
  PlatformAnalyticsOverviewResponse,
  PlatformLandingToAppVisitsResponse,
  PlatformLandingVisitsResponse,
  TrackPageviewBody,
  TrackPageviewResponse,
} from "@planwise/shared";
import { AbstractAnalyticsGatewayService } from "./ports/analytics.gateway.service.port";
import { AbstractAnalyticsService } from "./organizations/ports/analytics.service.port";

@Injectable()
export class AnalyticsGatewayService extends AbstractAnalyticsGatewayService {
  private readonly logger = new Logger(AnalyticsGatewayService.name);

  constructor(private readonly analytics: AbstractAnalyticsService) {
    super();
  }

  async trackPageview(body: TrackPageviewBody): Promise<TrackPageviewResponse> {
    try {
      return await this.analytics.trackPageview(body);
    } catch (err: unknown) {
      if (err instanceof BadRequestException) throw err;
      if (err instanceof HttpException && err.getStatus() === 400) {
        throw new BadRequestException(err.message || "Données analytics invalides");
      }
      this.logger.warn(`analytics track failed: ${(err as Error).message}`);
      return { ok: true };
    }
  }

  async getOverview(days?: number): Promise<PlatformAnalyticsOverviewResponse> {
    try {
      return await this.analytics.getOverview(days);
    } catch (err: unknown) {
      this.logger.warn(`analytics overview failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException("Statistiques temporairement indisponibles");
    }
  }

  async listLandingVisits(options?: {
    days?: number;
    limit?: number;
    offset?: number;
  }): Promise<PlatformLandingVisitsResponse> {
    try {
      return await this.analytics.listLandingVisits(options);
    } catch (err: unknown) {
      this.logger.warn(`analytics landing visits failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException("Statistiques temporairement indisponibles");
    }
  }

  async listLandingToAppVisits(options?: {
    days?: number;
    limit?: number;
    offset?: number;
  }): Promise<PlatformLandingToAppVisitsResponse> {
    try {
      return await this.analytics.listLandingToAppVisits(options);
    } catch (err: unknown) {
      this.logger.warn(`analytics landing-to-app visits failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException("Statistiques temporairement indisponibles");
    }
  }

  async listPathVisits(options: {
    surface: "marketing" | "app" | "platform";
    path: string;
    days?: number;
    limit?: number;
    offset?: number;
  }): Promise<PlatformLandingVisitsResponse> {
    try {
      return await this.analytics.listPathVisits(options);
    } catch (err: unknown) {
      this.logger.warn(`analytics path visits failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException("Statistiques temporairement indisponibles");
    }
  }
}
