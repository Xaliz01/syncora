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
  /** Entité cible au clic (ex. dossier parent d'une intervention, entité porteuse d'un document). */
  relatedEntityType?: NotificationEntityType;
  relatedEntityId?: string;
  /** Libellé de l'entité liée (ex. titre du dossier). */
  relatedEntityLabel?: string;
  /** Précision affichée (ex. champs modifiés, « intervention démarrée »). */
  detail?: string;
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
  relatedEntityType?: NotificationEntityType;
  relatedEntityId?: string;
  relatedEntityLabel?: string;
  detail?: string;
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
