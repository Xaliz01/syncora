import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import type {
  DocumentEntityType,
  DocumentResponse,
  OrganizationStorageUsageResponse,
} from "@planwise/shared";
import {
  activeDocumentFilter,
  formatStorageBytes,
  isStorageQuotaExceeded,
  MAX_DOCUMENT_FILE_SIZE_BYTES,
} from "@planwise/shared";
import type { DocumentRecord } from "../../persistence/documents/document.schema";
import { AbstractStorageProvider } from "../../infrastructure/storage/storage.port";
import { AbstractDocumentsService, UploadParams } from "./ports/documents.service.port";
import { toDocumentResponse } from "./mappers/document.mapper";

@Injectable()
export class DocumentsService extends AbstractDocumentsService {
  constructor(
    @InjectModel("DocumentRecord", "documents")
    private readonly documentModel: Model<DocumentRecord>,
    private readonly storage: AbstractStorageProvider,
  ) {
    super();
  }

  async getOrganizationStorageUsage(
    organizationId: string,
  ): Promise<OrganizationStorageUsageResponse> {
    const usedBytes = await this.sumActiveStorageBytes(organizationId);
    return { organizationId, usedBytes };
  }

  async upload(params: UploadParams): Promise<DocumentResponse> {
    if (params.size > MAX_DOCUMENT_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `Fichier trop volumineux (max ${formatStorageBytes(MAX_DOCUMENT_FILE_SIZE_BYTES)}).`,
      );
    }

    const usedBytes = await this.sumActiveStorageBytes(params.organizationId);
    if (isStorageQuotaExceeded(usedBytes, params.size, params.storageQuotaBytes)) {
      throw new BadRequestException(
        `Quota de stockage atteint (${formatStorageBytes(usedBytes)} / ${formatStorageBytes(params.storageQuotaBytes)}). ` +
          "Supprimez des fichiers ou ajoutez l'option stockage supplémentaire.",
      );
    }

    const storageKey = `${params.organizationId}/${params.entityType}/${params.entityId}/${uuidv4()}-${params.originalName}`;

    await this.storage.upload(storageKey, params.buffer, params.mimeType);

    const doc = await this.documentModel.create({
      organizationId: params.organizationId,
      entityType: params.entityType,
      entityId: params.entityId,
      originalName: params.originalName,
      mimeType: params.mimeType,
      size: params.size,
      storageKey,
      uploadedBy: params.uploadedBy,
    });

    return toDocumentResponse(doc);
  }

  async listByEntity(
    organizationId: string,
    entityType: DocumentEntityType,
    entityId: string,
  ): Promise<DocumentResponse[]> {
    const docs = await this.documentModel
      .find({ organizationId, entityType, entityId, ...activeDocumentFilter })
      .sort({ createdAt: -1 })
      .exec();
    return docs.map((doc) => toDocumentResponse(doc));
  }

  async getDownloadUrl(organizationId: string, documentId: string): Promise<string> {
    const doc = await this.findActiveRecord(organizationId, documentId);
    if (!doc) {
      throw new NotFoundException("Document introuvable");
    }
    return this.storage.getDownloadUrl(doc.storageKey);
  }

  async findActiveById(
    organizationId: string,
    documentId: string,
  ): Promise<DocumentResponse | null> {
    const doc = await this.findActiveRecord(organizationId, documentId);
    return doc ? toDocumentResponse(doc) : null;
  }

  async findActiveByStorageKey(
    organizationId: string,
    storageKey: string,
  ): Promise<DocumentResponse | null> {
    const normalizedKey = storageKey.trim();
    if (!normalizedKey) return null;
    const doc = await this.documentModel
      .findOne({ organizationId, storageKey: normalizedKey, ...activeDocumentFilter })
      .exec();
    return doc ? toDocumentResponse(doc) : null;
  }

  private async findActiveRecord(organizationId: string, documentId: string) {
    if (!Types.ObjectId.isValid(documentId)) return null;
    return this.documentModel
      .findOne({ _id: documentId, organizationId, ...activeDocumentFilter })
      .exec();
  }

  async deleteDocument(organizationId: string, documentId: string): Promise<{ deleted: true }> {
    const doc = await this.documentModel
      .findOne({ _id: documentId, organizationId, ...activeDocumentFilter })
      .exec();
    if (!doc) {
      throw new NotFoundException("Document introuvable");
    }
    await this.storage.delete(doc.storageKey);
    doc.deletedAt = new Date();
    await doc.save();
    return { deleted: true };
  }

  private async sumActiveStorageBytes(organizationId: string): Promise<number> {
    const rows = await this.documentModel
      .aggregate<{
        total: number;
      }>([
        { $match: { organizationId, ...activeDocumentFilter } },
        { $group: { _id: null, total: { $sum: "$size" } } },
      ])
      .exec();
    return rows[0]?.total ?? 0;
  }
}
