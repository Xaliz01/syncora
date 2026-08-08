import type { NotificationResponse } from "@planwise/shared";
import type { NotificationDocument } from "../../persistence/notification.schema";

export function toNotificationResponse(doc: NotificationDocument): NotificationResponse {
  return {
    id: doc._id.toString(),
    organizationId: doc.organizationId,
    userId: doc.userId,
    actorId: doc.actorId,
    actorName: doc.actorName,
    entityType: doc.entityType,
    entityId: doc.entityId,
    entityLabel: doc.entityLabel,
    action: doc.action,
    relatedEntityType: doc.relatedEntityType,
    relatedEntityId: doc.relatedEntityId,
    relatedEntityLabel: doc.relatedEntityLabel,
    detail: doc.detail,
    read: doc.read,
    createdAt: doc.get("createdAt")?.toISOString(),
  };
}
