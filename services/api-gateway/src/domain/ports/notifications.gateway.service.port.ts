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

export abstract class AbstractNotificationsGatewayService {
  abstract listForCurrentUser(user: AuthUser, limit?: number): Promise<NotificationListResponse>;
  abstract markAsRead(user: AuthUser, notificationId: string): Promise<NotificationResponse>;
  abstract markAllAsRead(user: AuthUser): Promise<{ updated: number }>;
  abstract getUnreadCount(user: AuthUser): Promise<{ count: number }>;

  abstract getPreferences(user: AuthUser): Promise<NotificationPreferencesResponse>;
  abstract updatePreferences(
    user: AuthUser,
    preferences: NotificationPreferencesData,
  ): Promise<NotificationPreferencesResponse>;

  abstract registerPushSubscription(
    user: AuthUser,
    body: RegisterPushSubscriptionBody,
  ): Promise<PushSubscriptionResponse>;
  abstract unregisterPushSubscription(
    user: AuthUser,
    endpoint: string,
  ): Promise<{ deleted: boolean }>;
  abstract listPushSubscriptions(user: AuthUser): Promise<PushSubscriptionResponse[]>;
  abstract getVapidPublicKey(): Promise<VapidPublicKeyResponse>;
}
