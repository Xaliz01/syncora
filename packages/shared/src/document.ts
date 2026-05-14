/** Document microservice contracts */

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
