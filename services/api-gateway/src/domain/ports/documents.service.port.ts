import type { Response } from "express";
import type { AuthUser, DocumentEntityType, DocumentResponse } from "@syncora/shared";

export abstract class AbstractDocumentsGatewayService {
  abstract upload(
    currentUser: AuthUser,
    entityType: DocumentEntityType,
    entityId: string,
    file: Express.Multer.File,
  ): Promise<DocumentResponse>;
  abstract listByEntity(
    currentUser: AuthUser,
    entityType: DocumentEntityType,
    entityId: string,
  ): Promise<DocumentResponse[]>;
  abstract getDownloadUrl(currentUser: AuthUser, documentId: string): Promise<{ url: string }>;
  abstract downloadFile(currentUser: AuthUser, encodedKey: string, res: Response): Promise<void>;
  abstract deleteDocument(currentUser: AuthUser, documentId: string): Promise<{ deleted: true }>;
}
