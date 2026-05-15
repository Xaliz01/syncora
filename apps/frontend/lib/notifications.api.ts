import { apiRequestJson } from "./api-client";
import type { NotificationListResponse, NotificationResponse } from "@syncora/shared";

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
