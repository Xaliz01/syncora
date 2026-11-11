import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import type { Response } from "express";
import type { AuthUser, DocumentEntityType, DocumentResponse } from "@planwise/shared";
import {
  AbstractDocumentsGatewayService,
  type DocumentUploadGatewayResponse,
} from "./ports/documents.service.port";
import { AbstractSubscriptionsGatewayService } from "./ports/subscriptions.service.port";
import { AbstractDocumentsService } from "./documents/ports/documents.service.port";
import { AbstractStorageProvider } from "../infrastructure/storage/storage.port";
import { LocalStorageProvider } from "../infrastructure/storage/local-storage.provider";
import { AbstractCasesService } from "./cases/ports/cases.service.port";
import { AbstractInterventionsService } from "./cases/ports/interventions.service.port";
import { AbstractCustomersService } from "./customers/ports/customers.service.port";
import { AbstractFleetService } from "./fleet/ports/fleet.service.port";
import { AbstractTechniciansService } from "./technicians/ports/technicians.service.port";
import { AbstractTeamsService } from "./technicians/ports/teams.service.port";
import { AbstractOrganizationsService } from "./organizations/ports/organizations.service.port";
import { AbstractPermissionsService } from "./permissions/ports/permissions.service.port";
import { assertDocumentParentAccess, resolveCallerPermissions } from "./permissions/caller-access";

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

@Injectable()
export class DocumentsGatewayService extends AbstractDocumentsGatewayService {
  constructor(
    private readonly documents: AbstractDocumentsService,
    private readonly storage: AbstractStorageProvider,
    private readonly subscriptionsGateway: AbstractSubscriptionsGatewayService,
    private readonly casesService: AbstractCasesService,
    private readonly interventionsService: AbstractInterventionsService,
    private readonly customersService: AbstractCustomersService,
    private readonly fleetService: AbstractFleetService,
    private readonly techniciansService: AbstractTechniciansService,
    private readonly teamsService: AbstractTeamsService,
    private readonly organizationsService: AbstractOrganizationsService,
    private readonly permissions: AbstractPermissionsService,
  ) {
    super();
  }

  async upload(
    currentUser: AuthUser,
    entityType: DocumentEntityType,
    entityId: string,
    file: Express.Multer.File,
  ): Promise<DocumentUploadGatewayResponse> {
    await this.assertParentAccess(currentUser, entityType, "write");
    const subscription = await this.subscriptionsGateway.getCurrentSubscription(currentUser);
    const document = await this.documents.upload({
      organizationId: currentUser.organizationId,
      entityType,
      entityId,
      uploadedBy: currentUser.id,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      buffer: file.buffer,
      storageQuotaBytes: subscription.storageQuotaBytes,
    });
    const relatedEntityLabel = await this.resolveDocumentHostLabel(
      currentUser.organizationId,
      entityType,
      entityId,
    );
    return { ...document, relatedEntityLabel };
  }

  private async resolveDocumentHostLabel(
    organizationId: string,
    entityType: DocumentEntityType,
    entityId: string,
  ): Promise<string | undefined> {
    try {
      switch (entityType) {
        case "case": {
          const item = await this.casesService.getCase(entityId, organizationId);
          return item.title?.trim() || undefined;
        }
        case "intervention": {
          const item = await this.interventionsService.getIntervention(entityId, organizationId);
          return item.title?.trim() || undefined;
        }
        case "customer": {
          const item = await this.customersService.getCustomer(entityId, organizationId);
          return item.displayName?.trim() || undefined;
        }
        case "vehicle": {
          const item = await this.fleetService.getVehicle(organizationId, entityId);
          return item.registrationNumber?.trim() || undefined;
        }
        case "technician": {
          const item = await this.techniciansService.getTechnician(organizationId, entityId);
          return [item.firstName, item.lastName].filter(Boolean).join(" ").trim() || undefined;
        }
        case "team": {
          const item = await this.teamsService.getTeam(organizationId, entityId);
          return item.name?.trim() || undefined;
        }
        case "organization": {
          const item = await this.organizationsService.findById(entityId);
          return item?.name?.trim() || undefined;
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
    await this.assertParentAccess(currentUser, entityType, "read");
    return this.documents.listByEntity(currentUser.organizationId, entityType, entityId);
  }

  async getDownloadUrl(currentUser: AuthUser, documentId: string): Promise<{ url: string }> {
    const document = await this.requireReadableDocument(currentUser, documentId);
    const url = await this.documents.getDownloadUrl(currentUser.organizationId, document.id);
    return { url: this.toClientDownloadUrl(url) };
  }

  async downloadFile(currentUser: AuthUser, encodedKey: string, res: Response): Promise<void> {
    const storageKey = decodeURIComponent(encodedKey);
    if (!storageKey.startsWith(`${currentUser.organizationId}/`)) {
      throw new ForbiddenException("Accès refusé à ce fichier");
    }
    const document = await this.documents.findActiveByStorageKey(
      currentUser.organizationId,
      storageKey,
    );
    if (!document) {
      throw new NotFoundException("Fichier introuvable");
    }
    await this.assertParentAccess(currentUser, document.entityType, "read");
    if (!(this.storage instanceof LocalStorageProvider)) {
      throw new BadRequestException("Direct download only available in local storage mode");
    }

    const filePath = this.storage.getAbsolutePath(document.storageKey);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException("Fichier introuvable");
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_BY_EXT[ext];
    if (contentType) res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${path.basename(filePath)}"`);
    res.sendFile(filePath);
  }

  /** URLs S3 présignées inchangées ; stockage local → proxy API gateway. */
  private toClientDownloadUrl(url: string): string {
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (url.startsWith("/documents/download/")) return `/api${url}`;
    return url;
  }

  async deleteDocument(currentUser: AuthUser, documentId: string): Promise<{ deleted: true }> {
    const document = await this.documents.findActiveById(currentUser.organizationId, documentId);
    if (!document) {
      throw new NotFoundException("Document introuvable");
    }
    await this.assertParentAccess(currentUser, document.entityType, "write");
    return this.documents.deleteDocument(currentUser.organizationId, document.id);
  }

  private async requireReadableDocument(currentUser: AuthUser, documentId: string) {
    const document = await this.documents.findActiveById(currentUser.organizationId, documentId);
    if (!document) {
      throw new NotFoundException("Document introuvable");
    }
    await this.assertParentAccess(currentUser, document.entityType, "read");
    return document;
  }

  private async assertParentAccess(
    currentUser: AuthUser,
    entityType: string,
    mode: "read" | "write",
  ): Promise<void> {
    const granted = await resolveCallerPermissions(this.permissions, currentUser);
    assertDocumentParentAccess(granted, entityType, mode);
  }
}
