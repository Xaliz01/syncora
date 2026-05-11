import type {
  AuthUser,
  NotificationListResponse,
  NotificationResponse
} from "@syncora/shared";

export abstract class AbstractNotificationsGatewayService {
  abstract listForCurrentUser(user: AuthUser, limit?: number): Promise<NotificationListResponse>;
  abstract markAsRead(user: AuthUser, notificationId: string): Promise<NotificationResponse>;
  abstract markAllAsRead(user: AuthUser): Promise<{ updated: number }>;
  abstract getUnreadCount(user: AuthUser): Promise<{ count: number }>;
}
