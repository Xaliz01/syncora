/** Document microservice contracts */

/** Taille maximale d'un fichier uploadé (10 Mo). */
export const MAX_DOCUMENT_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export interface OrganizationStorageUsageResponse {
  organizationId: string;
  usedBytes: number;
}

export type DocumentEntityType =
  | "case"
  | "vehicle"
  | "team"
  | "technician"
  | "customer"
  | "organization";

export interface UploadDocumentBody {
  organizationId: string;
  entityType: DocumentEntityType;
  entityId: string;
  uploadedBy: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface DocumentResponse {
  id: string;
  organizationId: string;
  entityType: DocumentEntityType;
  entityId: string;
  originalName: string;
  mimeType: string;
  size: number;
  storageKey: string;
  uploadedBy: string;
  createdAt: string;
}

export interface DocumentListQuery {
  organizationId: string;
  entityType: DocumentEntityType;
  entityId: string;
}
