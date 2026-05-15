import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import axios from "axios";
import { firstValueFrom } from "rxjs";
import type { AuthUser } from "@syncora/shared";
import type {
  CreateBillingPortalGatewayBody,
  CreateBillingPortalResponse,
  CreateCheckoutSessionGatewayBody,
  CreateCheckoutSessionResponse,
  OrganizationSubscriptionResponse,
} from "@syncora/shared";
import { AbstractSubscriptionsGatewayService } from "./ports/subscriptions.service.port";

const SUBSCRIPTIONS_URL = process.env.SUBSCRIPTIONS_SERVICE_URL ?? "http://localhost:3008";

@Injectable()
export class SubscriptionsGatewayService extends AbstractSubscriptionsGatewayService {
  constructor(private readonly httpService: HttpService) {
    super();
  }

  async getCurrentSubscription(user: AuthUser): Promise<OrganizationSubscriptionResponse> {
    return this.callSubscriptions<OrganizationSubscriptionResponse>({
      method: "get",
      path: "/subscriptions/current",
      query: { organizationId: user.organizationId },
    });
  }

  async createCheckoutSession(
    user: AuthUser,
    body: CreateCheckoutSessionGatewayBody,
  ): Promise<CreateCheckoutSessionResponse> {
    return this.callSubscriptions<CreateCheckoutSessionResponse>({
      method: "post",
      path: "/subscriptions/checkout-session",
      body: {
        organizationId: user.organizationId,
        customerEmail: body.customerEmail,
        successUrl: body.successUrl,
        cancelUrl: body.cancelUrl,
      },
    });
  }

  async createBillingPortalSession(
    user: AuthUser,
    body: CreateBillingPortalGatewayBody,
  ): Promise<CreateBillingPortalResponse> {
    return this.callSubscriptions<CreateBillingPortalResponse>({
      method: "post",
      path: "/subscriptions/billing-portal",
      body: {
        organizationId: user.organizationId,
        returnUrl: body.returnUrl,
      },
    });
  }

  private async callSubscriptions<T>(params: {
    method: "get" | "post";
    path: string;
    body?: unknown;
    query?: Record<string, unknown>;
  }): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.request<T>({
          method: params.method,
          url: `${SUBSCRIPTIONS_URL}${params.path}`,
          data: params.body,
          params: params.query,
        }),
      );
      return response.data;
    } catch (err: unknown) {
      this.rethrowAsHttpException(err);
    }
  }

  private rethrowAsHttpException(err: unknown): never {
    if (axios.isAxiosError(err)) {
      const res = err.response;
      const netCode = err.code;

      if (
        !res &&
        (netCode === "ECONNREFUSED" ||
          netCode === "ECONNRESET" ||
          netCode === "ETIMEDOUT" ||
          netCode === "ENOTFOUND")
      ) {
        throw new ServiceUnavailableException(
          `Service subscriptions injoignable (${SUBSCRIPTIONS_URL}). Lancez « npm run start:dev -w @syncora/subscriptions-service » (port 3008) ou définissez SUBSCRIPTIONS_SERVICE_URL.`,
        );
      }

      const status = res?.status;
      const data = res?.data as Record<string, unknown> | string | undefined;

      const extractMessage = (): string => {
        if (typeof data === "string" && data.trim()) {
          return data.trim();
        }
        if (data && typeof data === "object") {
          const m = data.message;
          if (Array.isArray(m)) {
            return m.map(String).join(", ");
          }
          if (typeof m === "string" && m.trim()) {
            return m.trim();
          }
          const e = data.error;
          if (typeof e === "string" && e.trim()) {
            return e.trim();
          }
        }
        if (err.message?.trim()) {
          return err.message.trim();
        }
        return status
          ? `Erreur HTTP ${status} depuis le service subscriptions`
          : "Erreur du service subscriptions (réponse invalide)";
      };

      const text = extractMessage();

      if (status === 400) throw new BadRequestException(text);
      if (status === 403) throw new ForbiddenException(text);
      if (status === 404) throw new NotFoundException(text);
      if (status === 409) throw new ConflictException(text);
      if (status === 502 || status === 503) {
        throw new ServiceUnavailableException(text);
      }
      throw new InternalServerErrorException(text);
    }

    throw new InternalServerErrorException(
      err instanceof Error ? err.message : "Subscriptions service error",
    );
  }
}
