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

/* ── Canaux de notification ─────────────────────────────────── */

export const NOTIFICATION_CHANNELS = ["in_app", "email", "push", "sms"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_CHANNEL_LABELS: Record<NotificationChannel, string> = {
  in_app: "In-app",
  email: "E-mail",
  push: "Notification push (mobile)",
  sms: "SMS",
};

/* ── Types d'événements de notification ─────────────────────── */

export const NOTIFICATION_EVENT_TYPES = [
  "intervention_assigned",
  "intervention_reminder",
  "intervention_started",
  "intervention_completed",
  "intervention_signed",
  "case_created",
  "case_status_changed",
  "case_assigned",
  "entity_updated",
] as const;
export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];

export const NOTIFICATION_EVENT_TYPE_LABELS: Record<NotificationEventType, string> = {
  intervention_assigned: "Intervention assignée",
  intervention_reminder: "Rappel avant intervention",
  intervention_started: "Intervention démarrée",
  intervention_completed: "Intervention terminée",
  intervention_signed: "Intervention signée",
  case_created: "Nouveau dossier",
  case_status_changed: "Changement de statut de dossier",
  case_assigned: "Dossier assigné",
  entity_updated: "Modification d'entité (général)",
};

/** Délais de rappel possibles (en minutes). */
export const REMINDER_LEAD_TIMES = [15, 30, 60, 120, 1440] as const;
export type ReminderLeadTime = (typeof REMINDER_LEAD_TIMES)[number];

export const REMINDER_LEAD_TIME_LABELS: Record<ReminderLeadTime, string> = {
  15: "15 minutes avant",
  30: "30 minutes avant",
  60: "1 heure avant",
  120: "2 heures avant",
  1440: "1 jour avant",
};

/* ── Préférences de notification ────────────────────────────── */

export interface NotificationChannelPreference {
  enabled: boolean;
}

export interface NotificationEventPreference {
  channels: Record<NotificationChannel, NotificationChannelPreference>;
}

export interface NotificationPreferencesData {
  events: Record<NotificationEventType, NotificationEventPreference>;
  reminderLeadTime: ReminderLeadTime;
}

export interface NotificationPreferencesResponse {
  id: string;
  userId: string;
  organizationId: string;
  preferences: NotificationPreferencesData;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateNotificationPreferencesBody {
  organizationId: string;
  preferences: NotificationPreferencesData;
}

export function buildDefaultNotificationPreferences(): NotificationPreferencesData {
  const events = {} as Record<NotificationEventType, NotificationEventPreference>;
  for (const eventType of NOTIFICATION_EVENT_TYPES) {
    events[eventType] = {
      channels: {
        in_app: { enabled: true },
        email: {
          enabled: eventType === "intervention_assigned" || eventType === "intervention_reminder",
        },
        push: {
          enabled: eventType === "intervention_assigned" || eventType === "intervention_reminder",
        },
        sms: { enabled: false },
      },
    };
  }

  return { events, reminderLeadTime: 30 };
}

/**
 * Determine which channels are enabled for a given event type.
 * Falls back to defaults if the user has no preferences.
 */
export function getEnabledChannels(
  preferences: NotificationPreferencesData | undefined,
  eventType: NotificationEventType,
): NotificationChannel[] {
  const prefs = preferences ?? buildDefaultNotificationPreferences();
  const eventPref = prefs.events[eventType];
  if (!eventPref) return ["in_app"];
  return NOTIFICATION_CHANNELS.filter((ch) => eventPref.channels[ch]?.enabled);
}

/* ── Push subscriptions ─────────────────────────────────────── */

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface RegisterPushSubscriptionBody {
  organizationId: string;
  endpoint: string;
  keys: PushSubscriptionKeys;
}

export interface PushSubscriptionResponse {
  id: string;
  userId: string;
  organizationId: string;
  endpoint: string;
  createdAt?: string;
}

export interface VapidPublicKeyResponse {
  publicKey: string;
}

/* ── Email notifications ───────────────────────────────────── */

export interface SendEmailNotificationBody {
  userId: string;
  organizationId: string;
  subject: string;
  body: string;
  eventType: NotificationEventType;
  url?: string;
}

export interface SendEmailNotificationResponse {
  sent: boolean;
  reason?: string;
}
