import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type { Response } from "express";
import FormData from "form-data";
import type { AuthUser, DocumentEntityType, DocumentResponse } from "@planwise/shared";
import { MAX_DOCUMENT_FILE_SIZE_BYTES } from "@planwise/shared";
import {
  AbstractDocumentsGatewayService,
  type DocumentUploadGatewayResponse,
} from "./ports/documents.service.port";
import { AbstractSubscriptionsGatewayService } from "./ports/subscriptions.service.port";
import { SERVICE_URLS } from "../infrastructure/service-urls.config";

@Injectable()
export class DocumentsGatewayService extends AbstractDocumentsGatewayService {
  constructor(
    private readonly httpService: HttpService,
    private readonly subscriptionsGateway: AbstractSubscriptionsGatewayService,
  ) {
    super();
  }

  async upload(
    currentUser: AuthUser,
    entityType: DocumentEntityType,
    entityId: string,
    file: Express.Multer.File,
  ): Promise<DocumentUploadGatewayResponse> {
    const form = new FormData();
    form.append("file", file.buffer, {
      filename: file.originalname,
      contentType: file.mimetype,
    });

    const subscription = await this.subscriptionsGateway.getCurrentSubscription(currentUser);

    const queryParams = new URLSearchParams({
      organizationId: currentUser.organizationId,
      entityType,
      entityId,
      uploadedBy: currentUser.id,
      storageQuotaBytes: String(subscription.storageQuotaBytes),
    });

    const response = await firstValueFrom(
      this.httpService.post<DocumentResponse>(
        `${SERVICE_URLS.documents}/documents/upload?${queryParams.toString()}`,
        form,
        { headers: form.getHeaders(), maxContentLength: MAX_DOCUMENT_FILE_SIZE_BYTES },
      ),
    );
    const relatedEntityLabel = await this.resolveDocumentHostLabel(
      currentUser.organizationId,
      entityType,
      entityId,
    );
    return { ...response.data, relatedEntityLabel };
  }

  private async resolveDocumentHostLabel(
    organizationId: string,
    entityType: DocumentEntityType,
    entityId: string,
  ): Promise<string | undefined> {
    const params = { organizationId };
    try {
      switch (entityType) {
        case "case": {
          const res = await firstValueFrom(
            this.httpService.get<{ title?: string }>(`${SERVICE_URLS.cases}/cases/${entityId}`, {
              params,
            }),
          );
          return res.data.title?.trim() || undefined;
        }
        case "intervention": {
          const res = await firstValueFrom(
            this.httpService.get<{ title?: string }>(
              `${SERVICE_URLS.cases}/interventions/${entityId}`,
              {
                params,
              },
            ),
          );
          return res.data.title?.trim() || undefined;
        }
        case "customer": {
          const res = await firstValueFrom(
            this.httpService.get<{ displayName?: string }>(
              `${SERVICE_URLS.customers}/customers/${entityId}`,
              { params },
            ),
          );
          return res.data.displayName?.trim() || undefined;
        }
        case "vehicle": {
          const res = await firstValueFrom(
            this.httpService.get<{ registrationNumber?: string }>(
              `${SERVICE_URLS.fleet}/vehicles/${entityId}`,
              { params },
            ),
          );
          return res.data.registrationNumber?.trim() || undefined;
        }
        case "technician": {
          const res = await firstValueFrom(
            this.httpService.get<{ firstName?: string; lastName?: string }>(
              `${SERVICE_URLS.technicians}/technicians/${entityId}`,
              { params },
            ),
          );
          return (
            [res.data.firstName, res.data.lastName].filter(Boolean).join(" ").trim() || undefined
          );
        }
        case "team": {
          const res = await firstValueFrom(
            this.httpService.get<{ name?: string }>(
              `${SERVICE_URLS.technicians}/teams/${entityId}`,
              {
                params,
              },
            ),
          );
          return res.data.name?.trim() || undefined;
        }
        case "organization": {
          const res = await firstValueFrom(
            this.httpService.get<{ name?: string }>(
              `${SERVICE_URLS.organizations}/organizations/${entityId}`,
            ),
          );
          return res.data.name?.trim() || undefined;
        }
        default:
          return undefined;
      }
    } catch {
      return undefined;
    }
  }

  async listByEntity(
    currentUser: AuthUser,
    entityType: DocumentEntityType,
    entityId: string,
  ): Promise<DocumentResponse[]> {
    const response = await firstValueFrom(
      this.httpService.get<DocumentResponse[]>(`${SERVICE_URLS.documents}/documents`, {
        params: {
          organizationId: currentUser.organizationId,
          entityType,
          entityId,
        },
      }),
    );
    return response.data;
  }

  async getDownloadUrl(currentUser: AuthUser, documentId: string): Promise<{ url: string }> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<{ url: string }>(
          `${SERVICE_URLS.documents}/documents/${documentId}/download-url`,
          { params: { organizationId: currentUser.organizationId } },
        ),
      );
      return { url: this.toClientDownloadUrl(response.data.url) };
    } catch (err: unknown) {
      this.rethrowAsHttpException(err);
    }
  }

  async downloadFile(currentUser: AuthUser, encodedKey: string, res: Response): Promise<void> {
    const storageKey = decodeURIComponent(encodedKey);
    if (!storageKey.startsWith(`${currentUser.organizationId}/`)) {
      throw new ForbiddenException("Accès refusé à ce fichier");
    }

    // Nest décode %2F → / dans :key ; le downstream attend un seul segment encodé.
    const downstreamKey = encodeURIComponent(storageKey);

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${SERVICE_URLS.documents}/documents/download/${downstreamKey}`, {
          responseType: "stream",
        }),
      );

      const headers = response.headers as Record<string, string | undefined>;
      if (headers["content-type"]) res.setHeader("Content-Type", headers["content-type"]);
      if (headers["content-disposition"]) {
        res.setHeader("Content-Disposition", headers["content-disposition"]);
      }
      response.data.pipe(res);
    } catch (err: unknown) {
      this.rethrowAsHttpException(err);
    }
  }

  /** URLs S3 présignées inchangées ; stockage local → proxy API gateway. */
  private toClientDownloadUrl(url: string): string {
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (url.startsWith("/documents/download/")) return `/api${url}`;
    return url;
  }

  async deleteDocument(currentUser: AuthUser, documentId: string): Promise<{ deleted: true }> {
    try {
      const response = await firstValueFrom(
        this.httpService.delete<{ deleted: true }>(
          `${SERVICE_URLS.documents}/documents/${documentId}`,
          {
            params: { organizationId: currentUser.organizationId },
          },
        ),
      );
      return response.data;
    } catch (err: unknown) {
      this.rethrowAsHttpException(err);
    }
  }

  private rethrowAsHttpException(err: unknown): never {
    const axiosErr = err as {
      response?: { status?: number; data?: { message?: string | string[] } };
    };
    const status = axiosErr.response?.status;
    const raw = axiosErr.response?.data?.message;
    const message = Array.isArray(raw) ? raw.join(", ") : (raw ?? "Downstream service error");

    if (status === 400) throw new BadRequestException(message);
    if (status === 403) throw new ForbiddenException(message);
    if (status === 404) throw new NotFoundException(message);
    throw err;
  }
}
