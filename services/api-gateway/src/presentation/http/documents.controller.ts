import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import type { DocumentEntityType } from "@syncora/shared";
import type { AuthUser } from "@syncora/shared";
import { AbstractDocumentsGatewayService } from "../../domain/ports/documents.service.port";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import { SubscriptionAccessGuard } from "../../infrastructure/subscription-access.guard";
import { CurrentUser } from "../../infrastructure/current-user.decorator";
import { NotifyEntity } from "../../infrastructure/notify-entity.decorator";

@Controller("documents")
@UseGuards(JwtAuthGuard, SubscriptionAccessGuard)
export class DocumentsController {
  constructor(private readonly documentsService: AbstractDocumentsGatewayService) {}

  @Post("upload/:entityType/:entityId")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 50 * 1024 * 1024 } }))
  @NotifyEntity({ type: "document", labelField: "originalName" })
  async upload(
    @CurrentUser() user: AuthUser,
    @Param("entityType") entityType: DocumentEntityType,
    @Param("entityId") entityId: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.documentsService.upload(user, entityType, entityId, file);
  }

  @Get("download/:key")
  async downloadFile(
    @CurrentUser() user: AuthUser,
    @Param("key") key: string,
    @Res() res: Response
  ) {
    return this.documentsService.downloadFile(user, key, res);
  }

  /** Routes à segments fixes avant `:entityType/:entityId` (sinon `…/id/download-url` est pris pour une liste). */
  @Get(":documentId/download-url")
  async getDownloadUrl(
    @CurrentUser() user: AuthUser,
    @Param("documentId") documentId: string
  ) {
    return this.documentsService.getDownloadUrl(user, documentId);
  }

  @Delete(":documentId")
  @NotifyEntity({ type: "document", idParam: "documentId" })
  async deleteDocument(
    @CurrentUser() user: AuthUser,
    @Param("documentId") documentId: string
  ) {
    return this.documentsService.deleteDocument(user, documentId);
  }

  @Get(":entityType/:entityId")
  async listByEntity(
    @CurrentUser() user: AuthUser,
    @Param("entityType") entityType: DocumentEntityType,
    @Param("entityId") entityId: string
  ) {
    return this.documentsService.listByEntity(user, entityType, entityId);
  }
}
