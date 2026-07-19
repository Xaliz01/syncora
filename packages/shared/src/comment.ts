/** Commentaires sur dossiers et interventions */

export type CommentEntityType = "case" | "intervention";

/** Longueur max du corps d'un commentaire (caractères). */
export const MAX_COMMENT_BODY_LENGTH = 5000;

export interface CommentResponse {
  id: string;
  organizationId: string;
  entityType: CommentEntityType;
  entityId: string;
  /** Dossier parent (dénormalisé pour historique / listing). */
  caseId: string;
  body: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateCommentBody {
  organizationId: string;
  entityType: CommentEntityType;
  entityId: string;
  body: string;
  authorId: string;
  authorName: string;
}

export interface UpdateCommentBody {
  organizationId: string;
  body: string;
}

export interface CommentListQuery {
  organizationId: string;
  entityType: CommentEntityType;
  entityId: string;
}
