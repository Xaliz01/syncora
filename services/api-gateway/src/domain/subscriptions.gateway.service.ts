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
import type { AuthUser, OrganizationStorageUsageResponse } from "@planwise/shared";
import type {
  CreateAddonCheckoutSessionGatewayBody,
  CreateBillingPortalGatewayBody,
  CreateBillingPortalResponse,
  CreateCheckoutSessionGatewayBody,
  CreateCheckoutSessionResponse,
  OrganizationSubscriptionResponse,
  StartTrialResponse,
  ExtendTrialResponse,
  UpdateSubscriptionAddonsGatewayBody,
  UpdateSubscriptionAddonsResponse,
} from "@planwise/shared";
import {
  BASE_SUBSCRIPTION_STORAGE_BYTES,
  computeOrganizationStorageQuotaBytes,
  isStorageQuotaWarning,
} from "@planwise/shared";
import { AbstractSubscriptionsGatewayService } from "./ports/subscriptions.service.port";

const SUBSCRIPTIONS_URL = process.env.SUBSCRIPTIONS_SERVICE_URL ?? "http://localhost:3008";
const DOCUMENTS_URL = process.env.DOCUMENTS_SERVICE_URL ?? "http://localhost:3011";

@Injectable()
export class SubscriptionsGatewayService extends AbstractSubscriptionsGatewayService {
  constructor(private readonly httpService: HttpService) {
    super();
  }

  async getCurrentSubscription(user: AuthUser): Promise<OrganizationSubscriptionResponse> {
    const sub = await this.callSubscriptions<OrganizationSubscriptionResponse>({
      method: "get",
      path: "/subscriptions/current",
      query: { organizationId: user.organizationId },
    });

    const storageQuotaBytes = computeOrganizationStorageQuotaBytes(sub.addonQuantities);
    let storageUsedBytes = sub.storageUsedBytes ?? 0;
    try {
      const usage = await firstValueFrom(
        this.httpService.get<OrganizationStorageUsageResponse>(
          `${DOCUMENTS_URL}/documents/storage-usage`,
          { params: { organizationId: user.organizationId } },
        ),
      );
      storageUsedBytes = usage.data.usedBytes;
    } catch {
      /* documents-service indisponible : conserver la valeur par défaut */
    }

    return {
      ...sub,
      storageQuotaBytes,
      storageUsedBytes,
      storageWarning: isStorageQuotaWarning(storageUsedBytes, storageQuotaBytes),
      includedStorageBytes: BASE_SUBSCRIPTION_STORAGE_BYTES,
    };
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

  async startTrial(user: AuthUser): Promise<StartTrialResponse> {
    return this.callSubscriptions<StartTrialResponse>({
      method: "post",
      path: "/subscriptions/start-trial",
      body: { organizationId: user.organizationId },
    });
  }

  async extendTrial(user: AuthUser): Promise<ExtendTrialResponse> {
    return this.callSubscriptions<ExtendTrialResponse>({
      method: "post",
      path: "/subscriptions/extend-trial",
      body: { organizationId: user.organizationId },
    });
  }

  async createAddonCheckoutSession(
    user: AuthUser,
    body: CreateAddonCheckoutSessionGatewayBody,
  ): Promise<CreateCheckoutSessionResponse> {
    return this.callSubscriptions<CreateCheckoutSessionResponse>({
      method: "post",
      path: "/subscriptions/addon-checkout-session",
      body: {
        organizationId: user.organizationId,
        addonCode: body.addonCode,
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
        flow: body.flow,
      },
    });
  }

  async updateSubscriptionAddons(
    user: AuthUser,
    body: UpdateSubscriptionAddonsGatewayBody,
  ): Promise<UpdateSubscriptionAddonsResponse> {
    return this.callSubscriptions<UpdateSubscriptionAddonsResponse>({
      method: "post",
      path: "/subscriptions/update-addons",
      body: {
        organizationId: user.organizationId,
        addonCodes: body.addonCodes,
        addonQuantities: body.addonQuantities,
        successUrl: body.successUrl,
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
          `Service subscriptions injoignable (${SUBSCRIPTIONS_URL}). Lancez « npm run start:dev -w @planwise/subscriptions-service » (port 3008) ou définissez SUBSCRIPTIONS_SERVICE_URL.`,
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
