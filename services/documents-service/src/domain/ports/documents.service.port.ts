import type { DocumentResponse, DocumentEntityType } from "@syncora/shared";

export interface UploadParams {
  organizationId: string;
  entityType: DocumentEntityType;
  entityId: string;
  uploadedBy: string;
  originalName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
}

export abstract class AbstractDocumentsService {
  abstract upload(params: UploadParams): Promise<DocumentResponse>;
  abstract listByEntity(
    organizationId: string,
    entityType: DocumentEntityType,
    entityId: string,
  ): Promise<DocumentResponse[]>;
  abstract getDownloadUrl(organizationId: string, documentId: string): Promise<string>;
  abstract deleteDocument(organizationId: string, documentId: string): Promise<{ deleted: true }>;
}
