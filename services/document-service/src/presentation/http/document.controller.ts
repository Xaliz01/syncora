import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import * as fs from "fs";
import * as path from "path";
import type { DocumentEntityType } from "@syncora/shared";
import { AbstractDocumentService } from "../../domain/ports/document.service.port";
import { LocalStorageProvider } from "../../infrastructure/local-storage.provider";
import { AbstractStorageProvider } from "../../infrastructure/storage.port";

const VALID_ENTITY_TYPES: DocumentEntityType[] = [
  "case", "vehicle", "team", "technician", "customer", "organization"
];

@Controller("documents")
export class DocumentController {
  constructor(
    private readonly documentService: AbstractDocumentService,
    private readonly storage: AbstractStorageProvider
  ) {}

  @Post("upload")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 50 * 1024 * 1024 } }))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query("organizationId") organizationId: string,
    @Query("entityType") entityType: string,
    @Query("entityId") entityId: string,
    @Query("uploadedBy") uploadedBy: string
  ) {
    if (!file) throw new BadRequestException("Fichier requis");
    if (!organizationId) throw new BadRequestException("organizationId requis");
    if (!entityType || !VALID_ENTITY_TYPES.includes(entityType as DocumentEntityType)) {
      throw new BadRequestException("entityType invalide");
    }
    if (!entityId) throw new BadRequestException("entityId requis");
    if (!uploadedBy) throw new BadRequestException("uploadedBy requis");

    return this.documentService.upload({
      organizationId,
      entityType: entityType as DocumentEntityType,
      entityId,
      uploadedBy,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      buffer: file.buffer
    });
  }

  @Get()
  async listByEntity(
    @Query("organizationId") organizationId: string,
    @Query("entityType") entityType: string,
    @Query("entityId") entityId: string
  ) {
    if (!organizationId) throw new BadRequestException("organizationId requis");
    if (!entityType || !VALID_ENTITY_TYPES.includes(entityType as DocumentEntityType)) {
      throw new BadRequestException("entityType invalide");
    }
    if (!entityId) throw new BadRequestException("entityId requis");

    return this.documentService.listByEntity(
      organizationId,
      entityType as DocumentEntityType,
      entityId
    );
  }

  @Get(":id/download-url")
  async getDownloadUrl(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string
  ) {
    if (!organizationId) throw new BadRequestException("organizationId requis");
    const url = await this.documentService.getDownloadUrl(organizationId, id);
    return { url };
  }

  @Get("download/:key(*)")
  async downloadLocal(
    @Param("key") key: string,
    @Res() res: Response
  ) {
    if (!(this.storage instanceof LocalStorageProvider)) {
      throw new BadRequestException("Direct download only available in local storage mode");
    }
    const filePath = (this.storage as LocalStorageProvider).getAbsolutePath(decodeURIComponent(key));
    if (!fs.existsSync(filePath)) {
      throw new BadRequestException("Fichier introuvable");
    }
    res.setHeader("Content-Disposition", `attachment; filename="${path.basename(filePath)}"`);
    res.sendFile(filePath);
  }

  @Delete(":id")
  async deleteDocument(
    @Param("id") id: string,
    @Query("organizationId") organizationId: string
  ) {
    if (!organizationId) throw new BadRequestException("organizationId requis");
    return this.documentService.deleteDocument(organizationId, id);
  }
}
