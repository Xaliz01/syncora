import type {
  DocumentResponse,
  DocumentEntityType,
  OrganizationStorageUsageResponse,
} from "@planwise/shared";

export interface UploadParams {
  organizationId: string;
  entityType: DocumentEntityType;
  entityId: string;
  uploadedBy: string;
  originalName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
  /** Quota organisation (octets) — contrôle avant écriture stockage. */
  storageQuotaBytes: number;
}

export abstract class AbstractDocumentsService {
  abstract getOrganizationStorageUsage(
    organizationId: string,
  ): Promise<OrganizationStorageUsageResponse>;
  abstract upload(params: UploadParams): Promise<DocumentResponse>;
  abstract listByEntity(
    organizationId: string,
    entityType: DocumentEntityType,
    entityId: string,
  ): Promise<DocumentResponse[]>;
  abstract getDownloadUrl(organizationId: string, documentId: string): Promise<string>;
  abstract deleteDocument(organizationId: string, documentId: string): Promise<{ deleted: true }>;
}
