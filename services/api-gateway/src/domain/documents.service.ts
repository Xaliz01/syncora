import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import FormData from "form-data";
import type { AuthUser, DocumentEntityType, DocumentResponse } from "@syncora/shared";
import { AbstractDocumentsGatewayService } from "./ports/documents.service.port";

const DOCUMENTS_URL = process.env.DOCUMENTS_SERVICE_URL ?? "http://localhost:3011";

@Injectable()
export class DocumentsGatewayService extends AbstractDocumentsGatewayService {
  constructor(private readonly httpService: HttpService) {
    super();
  }

  async upload(
    currentUser: AuthUser,
    entityType: DocumentEntityType,
    entityId: string,
    file: Express.Multer.File
  ): Promise<DocumentResponse> {
    const form = new FormData();
    form.append("file", file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype
    });

    const queryParams = new URLSearchParams({
      organizationId: currentUser.organizationId,
      entityType,
      entityId,
      uploadedBy: currentUser.id
    });

    const response = await firstValueFrom(
      this.httpService.post<DocumentResponse>(
        `${DOCUMENTS_URL}/documents/upload?${queryParams.toString()}`,
        form,
        { headers: form.getHeaders(), maxContentLength: 50 * 1024 * 1024 }
      )
    );
    return response.data;
  }

  async listByEntity(
    currentUser: AuthUser,
    entityType: DocumentEntityType,
    entityId: string
  ): Promise<DocumentResponse[]> {
    const response = await firstValueFrom(
      this.httpService.get<DocumentResponse[]>(`${DOCUMENTS_URL}/documents`, {
        params: {
          organizationId: currentUser.organizationId,
          entityType,
          entityId
        }
      })
    );
    return response.data;
  }

  async getDownloadUrl(currentUser: AuthUser, documentId: string): Promise<{ url: string }> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<{ url: string }>(
          `${DOCUMENTS_URL}/documents/${documentId}/download-url`,
          { params: { organizationId: currentUser.organizationId } }
        )
      );
      return response.data;
    } catch (err: unknown) {
      this.rethrowAsHttpException(err);
    }
  }

  async deleteDocument(currentUser: AuthUser, documentId: string): Promise<{ deleted: true }> {
    try {
      const response = await firstValueFrom(
        this.httpService.delete<{ deleted: true }>(
          `${DOCUMENTS_URL}/documents/${documentId}`,
          { params: { organizationId: currentUser.organizationId } }
        )
      );
      return response.data;
    } catch (err: unknown) {
      this.rethrowAsHttpException(err);
    }
  }

  private rethrowAsHttpException(err: unknown): never {
    const status = (err as { response?: { status?: number } })?.response?.status;
    const message =
      (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message ?? "Downstream service error";

    if (status === 400) throw new BadRequestException(message);
    if (status === 403) throw new ForbiddenException(message);
    if (status === 404) throw new NotFoundException(message);
    throw err;
  }
}
