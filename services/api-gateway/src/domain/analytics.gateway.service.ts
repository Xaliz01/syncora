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
  PlatformLandingVisitsResponse,
  TrackPageviewBody,
  TrackPageviewResponse,
} from "@planwise/shared";
import { AbstractAnalyticsGatewayService } from "./ports/analytics.gateway.service.port";

const ORGANIZATIONS_URL = process.env.ORGANIZATIONS_SERVICE_URL ?? "http://localhost:3001";

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
          `${ORGANIZATIONS_URL}/analytics/pageviews`,
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
          `${ORGANIZATIONS_URL}/platform/analytics/overview`,
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
          `${ORGANIZATIONS_URL}/platform/analytics/landing-visits`,
          { params: options, timeout: 10000 },
        ),
      );
      return res.data;
    } catch (err: unknown) {
      this.logger.warn(`analytics landing visits failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException("Statistiques temporairement indisponibles");
    }
  }
}
