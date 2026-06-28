import { SetMetadata } from "@nestjs/common";
import type { NotificationAction, NotificationEntityType } from "@planwise/shared";

export const NOTIFY_ENTITY_KEY = "notifyEntity";

export interface NotifyEntityMetadata {
  type: NotificationEntityType;
  action?: NotificationAction;
  /** Field name in the response body that holds the entity label (e.g. "title", "name"). */
  labelField?: string;
  /** Route param name to use as entity ID when response has no `id` field (e.g. for deletes). */
  idParam?: string;
  /** Entité liée pour la navigation (ex. dossier parent d'une intervention). */
  relatedEntityType?: NotificationEntityType;
  /** Champ du corps de réponse contenant l'ID de l'entité liée (ex. caseId, entityId). */
  relatedEntityIdField?: string;
  /** Champ du corps de réponse contenant le type de l'entité liée (ex. entityType pour un document). */
  relatedEntityTypeField?: string;
  /** Champ du corps de réponse contenant le libellé de l'entité liée (ex. titre du dossier). */
  relatedEntityLabelField?: string;
  /** Détail fixe affiché dans la notification (ex. « Intervention démarrée »). */
  fixedDetail?: string;
}

export const NotifyEntity = (metadata: NotifyEntityMetadata) =>
  SetMetadata(NOTIFY_ENTITY_KEY, metadata);
