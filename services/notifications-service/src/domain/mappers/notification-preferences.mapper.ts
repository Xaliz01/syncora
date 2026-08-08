import type { NotificationPreferencesResponse } from "@planwise/shared";
import { mergeNotificationPreferencesWithDefaults } from "@planwise/shared";
import type { NotificationPreferencesDocument } from "../../persistence/notification-preferences.schema";

export function toNotificationPreferencesResponse(
  doc: NotificationPreferencesDocument,
): NotificationPreferencesResponse {
  return {
    id: doc._id.toString(),
    userId: doc.userId,
    organizationId: doc.organizationId,
    preferences: mergeNotificationPreferencesWithDefaults(doc.preferences),
    createdAt: doc.get("createdAt")?.toISOString(),
    updatedAt: doc.get("updatedAt")?.toISOString(),
  };
}
