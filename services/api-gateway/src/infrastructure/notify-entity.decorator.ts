import { SetMetadata } from "@nestjs/common";
import type { NotificationAction, NotificationEntityType } from "@syncora/shared";

export const NOTIFY_ENTITY_KEY = "notifyEntity";

export interface NotifyEntityMetadata {
  type: NotificationEntityType;
  action?: NotificationAction;
  /** Field name in the response body that holds the entity label (e.g. "title", "name"). */
  labelField?: string;
  /** Route param name to use as entity ID when response has no `id` field (e.g. for deletes). */
  idParam?: string;
}

export const NotifyEntity = (metadata: NotifyEntityMetadata) =>
  SetMetadata(NOTIFY_ENTITY_KEY, metadata);
