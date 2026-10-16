import { Injectable, NotFoundException } from "@nestjs/common";
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
import { AbstractNotificationsService } from "./notifications/ports/notifications.service.port";
import { AbstractNotificationPreferencesService } from "./notifications/ports/notification-preferences.service.port";
import { AbstractPushSubscriptionService } from "./notifications/ports/push-subscription.service.port";

@Injectable()
export class NotificationsGatewayService extends AbstractNotificationsGatewayService {
  constructor(
    private readonly notifications: AbstractNotificationsService,
    private readonly preferences: AbstractNotificationPreferencesService,
    private readonly push: AbstractPushSubscriptionService,
  ) {
    super();
  }

  async listForCurrentUser(user: AuthUser, limit?: number): Promise<NotificationListResponse> {
    return this.notifications.listForUser(user.id, user.organizationId, limit);
  }

  async markAsRead(user: AuthUser, notificationId: string): Promise<NotificationResponse> {
    try {
      return await this.notifications.markAsRead(notificationId, user.id);
    } catch (err: unknown) {
      if (err instanceof NotFoundException) {
        throw new NotFoundException("Notification introuvable");
      }
      throw err;
    }
  }

  async markAllAsRead(user: AuthUser): Promise<{ updated: number }> {
    return this.notifications.markAllAsRead(user.id, user.organizationId);
  }

  async getUnreadCount(user: AuthUser): Promise<{ count: number }> {
    return this.notifications.getUnreadCount(user.id, user.organizationId);
  }

  async getPreferences(user: AuthUser): Promise<NotificationPreferencesResponse> {
    return this.preferences.getPreferences(user.id, user.organizationId);
  }

  async updatePreferences(
    user: AuthUser,
    preferences: NotificationPreferencesData,
  ): Promise<NotificationPreferencesResponse> {
    return this.preferences.updatePreferences(user.id, user.organizationId, preferences);
  }

  async registerPushSubscription(
    user: AuthUser,
    body: RegisterPushSubscriptionBody,
  ): Promise<PushSubscriptionResponse> {
    return this.push.register(
      user.id,
      user.organizationId,
      body.endpoint,
      body.keys.p256dh,
      body.keys.auth,
    );
  }

  async unregisterPushSubscription(
    user: AuthUser,
    endpoint: string,
  ): Promise<{ deleted: boolean }> {
    return this.push.unregister(user.id, endpoint);
  }

  async listPushSubscriptions(user: AuthUser): Promise<PushSubscriptionResponse[]> {
    return this.push.listForUser(user.id, user.organizationId);
  }

  async getVapidPublicKey(): Promise<VapidPublicKeyResponse> {
    return { publicKey: process.env.VAPID_PUBLIC_KEY ?? "" };
  }
}
