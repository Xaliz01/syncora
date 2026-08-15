import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  PlatformAnalyticsOverviewResponse,
  PlatformLandingToAppVisitsResponse,
  PlatformLandingVisitsResponse,
  TrackPageviewBody,
  TrackPageviewResponse,
} from "@planwise/shared";
import { AbstractAnalyticsGatewayService } from "./ports/analytics.gateway.service.port";
import { SERVICE_URLS } from "../infrastructure/service-urls.config";

@Injectable()
export class AnalyticsGatewayService extends AbstractAnalyticsGatewayService {
  private readonly logger = new Logger(AnalyticsGatewayService.name);

  constructor(private readonly httpService: HttpService) {
    super();
  }

  async trackPageview(body: TrackPageviewBody): Promise<TrackPageviewResponse> {
    try {
      const res = await firstValueFrom(
        this.httpService.post<TrackPageviewResponse>(
          `${SERVICE_URLS.organizations}/analytics/pageviews`,
          body,
          { timeout: 3000 },
        ),
      );
      return res.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      if (status === 400) {
        throw new BadRequestException(message ?? "Données analytics invalides");
      }
      this.logger.warn(`analytics track failed: ${(err as Error).message}`);
      // Ne pas faire échouer la navigation utilisateur.
      return { ok: true };
    }
  }

  async getOverview(days?: number): Promise<PlatformAnalyticsOverviewResponse> {
    try {
      const res = await firstValueFrom(
        this.httpService.get<PlatformAnalyticsOverviewResponse>(
          `${SERVICE_URLS.organizations}/platform/analytics/overview`,
          { params: { days }, timeout: 10000 },
        ),
      );
      return res.data;
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
      const res = await firstValueFrom(
        this.httpService.get<PlatformLandingVisitsResponse>(
          `${SERVICE_URLS.organizations}/platform/analytics/landing-visits`,
          { params: options, timeout: 10000 },
        ),
      );
      return res.data;
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
      const res = await firstValueFrom(
        this.httpService.get<PlatformLandingToAppVisitsResponse>(
          `${SERVICE_URLS.organizations}/platform/analytics/landing-to-app-visits`,
          { params: options, timeout: 10000 },
        ),
      );
      return res.data;
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
      const res = await firstValueFrom(
        this.httpService.get<PlatformLandingVisitsResponse>(
          `${SERVICE_URLS.organizations}/platform/analytics/path-visits`,
          { params: options, timeout: 10000 },
        ),
      );
      return res.data;
    } catch (err: unknown) {
      this.logger.warn(`analytics path visits failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException("Statistiques temporairement indisponibles");
    }
  }
}
