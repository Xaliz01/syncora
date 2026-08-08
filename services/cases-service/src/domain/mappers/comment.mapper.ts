import type { CommentResponse } from "@planwise/shared";
import type { CommentDocument } from "../../persistence/comment.schema";

export function toCommentResponse(doc: CommentDocument): CommentResponse {
  return {
    id: doc._id.toString(),
    organizationId: doc.organizationId,
    entityType: doc.entityType,
    entityId: doc.entityId,
    caseId: doc.caseId,
    body: doc.body,
    authorId: doc.authorId,
    authorName: doc.authorName,
    createdAt: doc.get("createdAt")?.toISOString() ?? new Date().toISOString(),
    updatedAt: doc.get("updatedAt")?.toISOString(),
  };
}
