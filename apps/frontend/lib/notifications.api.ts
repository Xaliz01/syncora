import { apiRequestJson } from "./api-client";
import type {
  NotificationListResponse,
  NotificationPreferencesData,
  NotificationPreferencesResponse,
  NotificationResponse,
  PushSubscriptionResponse,
  RegisterPushSubscriptionBody,
  VapidPublicKeyResponse,
} from "@planwise/shared";

export async function listNotifications(limit?: number): Promise<NotificationListResponse> {
  const query = limit ? `?limit=${limit}` : "";
  return apiRequestJson<NotificationListResponse>("GET", `/notifications${query}`, {
    fallbackError: "Impossible de charger les notifications",
  });
}

export async function markAsRead(notificationId: string): Promise<NotificationResponse> {
  return apiRequestJson<NotificationResponse>("PATCH", `/notifications/${notificationId}/read`, {
    fallbackError: "Impossible de marquer la notification comme lue",
  });
}

export async function markAllAsRead(): Promise<{ updated: number }> {
  return apiRequestJson<{ updated: number }>("PATCH", "/notifications/read-all", {
    fallbackError: "Impossible de marquer toutes les notifications comme lues",
  });
}

export async function getUnreadCount(): Promise<{ count: number }> {
  return apiRequestJson<{ count: number }>("GET", "/notifications/unread-count", {
    fallbackError: "Impossible de charger le compteur de notifications",
  });
}

export async function getPreferences(): Promise<NotificationPreferencesResponse> {
  return apiRequestJson<NotificationPreferencesResponse>("GET", "/notifications/preferences", {
    fallbackError: "Impossible de charger les préférences de notification",
  });
}

export async function updatePreferences(
  preferences: NotificationPreferencesData,
): Promise<NotificationPreferencesResponse> {
  return apiRequestJson<NotificationPreferencesResponse>("PUT", "/notifications/preferences", {
    body: { preferences },
    fallbackError: "Impossible de sauvegarder les préférences de notification",
  });
}

export async function registerPushSubscription(
  body: RegisterPushSubscriptionBody,
): Promise<PushSubscriptionResponse> {
  return apiRequestJson<PushSubscriptionResponse>("POST", "/notifications/push-subscriptions", {
    body,
    fallbackError: "Impossible d'enregistrer l'abonnement push",
  });
}

export async function unregisterPushSubscription(endpoint: string): Promise<{ deleted: boolean }> {
  return apiRequestJson<{ deleted: boolean }>(
    "DELETE",
    `/notifications/push-subscriptions?endpoint=${encodeURIComponent(endpoint)}`,
    { fallbackError: "Impossible de supprimer l'abonnement push" },
  );
}

export async function listPushSubscriptions(): Promise<PushSubscriptionResponse[]> {
  return apiRequestJson<PushSubscriptionResponse[]>("GET", "/notifications/push-subscriptions", {
    fallbackError: "Impossible de charger les abonnements push",
  });
}

export async function getVapidPublicKey(): Promise<VapidPublicKeyResponse> {
  return apiRequestJson<VapidPublicKeyResponse>("GET", "/notifications/vapid-public-key", {
    fallbackError: "Impossible de charger la clé VAPID",
  });
}
