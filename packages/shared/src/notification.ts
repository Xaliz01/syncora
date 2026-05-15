/** Contrat API notifications-service */

export type NotificationEntityType =
  | "case"
  | "intervention"
  | "case_template"
  | "customer"
  | "vehicle"
  | "technician"
  | "team"
  | "agence"
  | "article"
  | "stock_movement"
  | "organization"
  | "user"
  | "permission_profile"
  | "document";

export type NotificationAction = "created" | "updated" | "deleted";

export interface CreateNotificationBody {
  organizationId: string;
  actorId: string;
  actorName?: string;
  entityType: NotificationEntityType;
  entityId: string;
  entityLabel?: string;
  action: NotificationAction;
}

export interface NotificationResponse {
  id: string;
  organizationId: string;
  userId: string;
  actorId: string;
  actorName?: string;
  entityType: NotificationEntityType;
  entityId: string;
  entityLabel?: string;
  action: NotificationAction;
  read: boolean;
  createdAt?: string;
}

export interface NotificationListResponse {
  notifications: NotificationResponse[];
  unreadCount: number;
}

export interface MarkNotificationReadBody {
  notificationId: string;
}

export interface MarkAllNotificationsReadBody {
  organizationId: string;
}
