import type { DocumentEntityType, DocumentResponse } from "@planwise/shared";
import type { DocumentRecord } from "../../persistence/document.schema";

export function toDocumentResponse(doc: DocumentRecord): DocumentResponse {
  return {
    id: doc._id.toString(),
    organizationId: doc.organizationId,
    entityType: doc.entityType as DocumentEntityType,
    entityId: doc.entityId,
    originalName: doc.originalName,
    mimeType: doc.mimeType,
    size: doc.size,
    storageKey: doc.storageKey,
    uploadedBy: doc.uploadedBy,
    createdAt: doc.get("createdAt")?.toISOString(),
  };
}
