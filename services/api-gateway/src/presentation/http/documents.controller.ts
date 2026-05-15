import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
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

  @Get(":entityType/:entityId")
  async listByEntity(
    @CurrentUser() user: AuthUser,
    @Param("entityType") entityType: DocumentEntityType,
    @Param("entityId") entityId: string
  ) {
    return this.documentsService.listByEntity(user, entityType, entityId);
  }

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
}
