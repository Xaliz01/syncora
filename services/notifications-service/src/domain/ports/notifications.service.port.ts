import type {
  CreateNotificationBody,
  NotificationListResponse,
  NotificationResponse
} from "@syncora/shared";

export abstract class AbstractNotificationsService {
  abstract createForOrganization(body: CreateNotificationBody, userIds: string[]): Promise<NotificationResponse[]>;
  abstract listForUser(userId: string, organizationId: string, limit?: number): Promise<NotificationListResponse>;
  abstract markAsRead(notificationId: string, userId: string): Promise<NotificationResponse>;
  abstract markAllAsRead(userId: string, organizationId: string): Promise<{ updated: number }>;
  abstract getUnreadCount(userId: string, organizationId: string): Promise<{ count: number }>;
}
