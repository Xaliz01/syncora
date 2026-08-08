import { Injectable, NotFoundException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  AuthUser,
  NotificationListResponse,
  NotificationPreferencesData,
  NotificationPreferencesResponse,
  NotificationResponse,
  PushSubscriptionResponse,
  RegisterPushSubscriptionBody,
  VapidPublicKeyResponse,
} from "@planwise/shared";
import { AbstractNotificationsGatewayService } from "./ports/notifications.gateway.service.port";
import { SERVICE_URLS } from "../infrastructure/service-urls.config";

@Injectable()
export class NotificationsGatewayService extends AbstractNotificationsGatewayService {
  constructor(private readonly httpService: HttpService) {
    super();
  }

  async listForCurrentUser(user: AuthUser, limit?: number): Promise<NotificationListResponse> {
    const response = await firstValueFrom(
      this.httpService.get<NotificationListResponse>(
        `${SERVICE_URLS.notifications}/notifications`,
        {
          params: {
            userId: user.id,
            organizationId: user.organizationId,
            ...(limit ? { limit: String(limit) } : {}),
          },
        },
      ),
    );
    return response.data;
  }

  async markAsRead(user: AuthUser, notificationId: string): Promise<NotificationResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.patch<NotificationResponse>(
          `${SERVICE_URLS.notifications}/notifications/${notificationId}/read`,
          {},
          { params: { userId: user.id } },
        ),
      );
      return response.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) throw new NotFoundException("Notification introuvable");
      throw err;
    }
  }

  async markAllAsRead(user: AuthUser): Promise<{ updated: number }> {
    const response = await firstValueFrom(
      this.httpService.patch<{ updated: number }>(
        `${SERVICE_URLS.notifications}/notifications/read-all`,
        {},
        {
          params: {
            userId: user.id,
            organizationId: user.organizationId,
          },
        },
      ),
    );
    return response.data;
  }

  async getUnreadCount(user: AuthUser): Promise<{ count: number }> {
    const response = await firstValueFrom(
      this.httpService.get<{ count: number }>(
        `${SERVICE_URLS.notifications}/notifications/unread-count`,
        {
          params: {
            userId: user.id,
            organizationId: user.organizationId,
          },
        },
      ),
    );
    return response.data;
  }

  async getPreferences(user: AuthUser): Promise<NotificationPreferencesResponse> {
    const response = await firstValueFrom(
      this.httpService.get<NotificationPreferencesResponse>(
        `${SERVICE_URLS.notifications}/notification-preferences`,
        {
          params: {
            userId: user.id,
            organizationId: user.organizationId,
          },
        },
      ),
    );
    return response.data;
  }

  async updatePreferences(
    user: AuthUser,
    preferences: NotificationPreferencesData,
  ): Promise<NotificationPreferencesResponse> {
    const response = await firstValueFrom(
      this.httpService.put<NotificationPreferencesResponse>(
        `${SERVICE_URLS.notifications}/notification-preferences`,
        { organizationId: user.organizationId, preferences },
        { params: { userId: user.id } },
      ),
    );
    return response.data;
  }

  async registerPushSubscription(
    user: AuthUser,
    body: RegisterPushSubscriptionBody,
  ): Promise<PushSubscriptionResponse> {
    const response = await firstValueFrom(
      this.httpService.post<PushSubscriptionResponse>(
        `${SERVICE_URLS.notifications}/push-subscriptions`,
        { ...body, organizationId: user.organizationId },
        { params: { userId: user.id } },
      ),
    );
    return response.data;
  }

  async unregisterPushSubscription(
    user: AuthUser,
    endpoint: string,
  ): Promise<{ deleted: boolean }> {
    const response = await firstValueFrom(
      this.httpService.delete<{ deleted: boolean }>(
        `${SERVICE_URLS.notifications}/push-subscriptions`,
        {
          params: {
            userId: user.id,
            endpoint,
          },
        },
      ),
    );
    return response.data;
  }

  async listPushSubscriptions(user: AuthUser): Promise<PushSubscriptionResponse[]> {
    const response = await firstValueFrom(
      this.httpService.get<PushSubscriptionResponse[]>(
        `${SERVICE_URLS.notifications}/push-subscriptions`,
        {
          params: {
            userId: user.id,
            organizationId: user.organizationId,
          },
        },
      ),
    );
    return response.data;
  }

  async getVapidPublicKey(): Promise<VapidPublicKeyResponse> {
    const response = await firstValueFrom(
      this.httpService.get<VapidPublicKeyResponse>(
        `${SERVICE_URLS.notifications}/vapid-public-key`,
      ),
    );
    return response.data;
  }
}
