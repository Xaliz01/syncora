import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import type { AuthUser, DocumentResponse, PermissionCode } from "@planwise/shared";
import { DocumentsGatewayService } from "../documents.service";
import { AbstractDocumentsService } from "../documents/ports/documents.service.port";
import { AbstractSubscriptionsGatewayService } from "../ports/subscriptions.service.port";
import { AbstractStorageProvider } from "../../infrastructure/storage/storage.port";
import { AbstractCasesService } from "../cases/ports/cases.service.port";
import { AbstractInterventionsService } from "../cases/ports/interventions.service.port";
import { AbstractCustomersService } from "../customers/ports/customers.service.port";
import { AbstractFleetService } from "../fleet/ports/fleet.service.port";
import { AbstractTechniciansService } from "../technicians/ports/technicians.service.port";
import { AbstractTeamsService } from "../technicians/ports/teams.service.port";
import { AbstractOrganizationsService } from "../organizations/ports/organizations.service.port";
import { AbstractPermissionsService } from "../permissions/ports/permissions.service.port";

describe("DocumentsGatewayService permissions", () => {
  let service: DocumentsGatewayService;
  let documents: {
    upload: jest.Mock;
    listByEntity: jest.Mock;
    getDownloadUrl: jest.Mock;
    findActiveById: jest.Mock;
    findActiveByStorageKey: jest.Mock;
    deleteDocument: jest.Mock;
  };
  let permissions: { resolveEffectivePermissions: jest.Mock };
  let subscriptions: { getCurrentSubscription: jest.Mock };

  const caseDocument: DocumentResponse = {
    id: "507f1f77bcf86cd799439011",
    organizationId: "org-1",
    entityType: "case",
    entityId: "case-1",
    originalName: "rapport.pdf",
    mimeType: "application/pdf",
    size: 12,
    storageKey: "org-1/case/case-1/rapport.pdf",
    uploadedBy: "user-2",
    createdAt: "2026-01-01T00:00:00.000Z",
  };

  const admin: AuthUser = {
    id: "admin-1",
    email: "admin@test.fr",
    organizationId: "org-1",
    role: "admin",
    status: "active",
    permissions: [],
    name: "Admin",
  };

  beforeEach(async () => {
    documents = {
      upload: jest.fn().mockResolvedValue(caseDocument),
      listByEntity: jest.fn().mockResolvedValue([caseDocument]),
      getDownloadUrl: jest.fn().mockResolvedValue("https://files.example/rapport.pdf"),
      findActiveById: jest.fn().mockResolvedValue(caseDocument),
      findActiveByStorageKey: jest.fn().mockResolvedValue(caseDocument),
      deleteDocument: jest.fn().mockResolvedValue({ deleted: true }),
    };
    permissions = {
      resolveEffectivePermissions: jest.fn().mockResolvedValue({ permissions: [] }),
    };
    subscriptions = {
      getCurrentSubscription: jest.fn().mockResolvedValue({ storageQuotaBytes: 1_000_000 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsGatewayService,
        { provide: AbstractDocumentsService, useValue: documents },
        { provide: AbstractStorageProvider, useValue: {} },
        { provide: AbstractSubscriptionsGatewayService, useValue: subscriptions },
        { provide: AbstractCasesService, useValue: { getCase: jest.fn() } },
        { provide: AbstractInterventionsService, useValue: {} },
        { provide: AbstractCustomersService, useValue: {} },
        { provide: AbstractFleetService, useValue: {} },
        { provide: AbstractTechniciansService, useValue: {} },
        { provide: AbstractTeamsService, useValue: {} },
        { provide: AbstractOrganizationsService, useValue: {} },
        { provide: AbstractPermissionsService, useValue: permissions },
      ],
    }).compile();

    service = module.get(DocumentsGatewayService);
  });

  function memberWith(token: PermissionCode[], live: PermissionCode[] = token): AuthUser {
    permissions.resolveEffectivePermissions.mockResolvedValue({ permissions: live });
    return {
      id: "member-1",
      email: "membre@test.fr",
      organizationId: "org-1",
      role: "member",
      status: "active",
      permissions: token,
      name: "Membre",
    };
  }

  it("refuses to list case documents when the member cannot read cases", async () => {
    const member = memberWith(["customers.read", "billing.invoices.read"]);

    await expect(service.listByEntity(member, "case", "case-1")).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(documents.listByEntity).not.toHaveBeenCalled();
  });

  it("lists case documents for a member who can read cases, scoped to the organization", async () => {
    const member = memberWith(["cases.read"]);

    const result = await service.listByEntity(member, "case", "case-1");

    expect(result).toEqual([caseDocument]);
    expect(documents.listByEntity).toHaveBeenCalledWith("org-1", "case", "case-1");
  });

  it("returns 403 on download when the document parent is not readable", async () => {
    const member = memberWith(["customers.read"]);

    await expect(service.getDownloadUrl(member, caseDocument.id)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(documents.findActiveById).toHaveBeenCalledWith("org-1", caseDocument.id);
    expect(documents.getDownloadUrl).not.toHaveBeenCalled();
  });

  it("returns a download url when the member can read the parent", async () => {
    const member = memberWith(["cases.read"]);

    await expect(service.getDownloadUrl(member, caseDocument.id)).resolves.toEqual({
      url: "https://files.example/rapport.pdf",
    });
  });

  it("refuses upload and delete without the parent update permission", async () => {
    const member = memberWith(["cases.read"]);
    const file = {
      originalname: "a.pdf",
      mimetype: "application/pdf",
      size: 4,
    } as Express.Multer.File;

    await expect(service.upload(member, "case", "case-1", file)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.deleteDocument(member, caseDocument.id)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(documents.upload).not.toHaveBeenCalled();
    expect(documents.deleteDocument).not.toHaveBeenCalled();
    expect(subscriptions.getCurrentSubscription).not.toHaveBeenCalled();
  });

  it("uploads and deletes when the member can update the parent", async () => {
    const member = memberWith(["cases.update", "cases.read"]);
    const file = {
      originalname: "a.pdf",
      mimetype: "application/pdf",
      size: 4,
      buffer: Buffer.from("pdf"),
    } as Express.Multer.File;

    await expect(service.upload(member, "case", "case-1", file)).resolves.toEqual(
      expect.objectContaining({ id: caseDocument.id }),
    );
    await expect(service.deleteDocument(member, caseDocument.id)).resolves.toEqual({
      deleted: true,
    });
    expect(documents.upload).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org-1", entityType: "case", entityId: "case-1" }),
    );
    expect(documents.deleteDocument).toHaveBeenCalledWith("org-1", caseDocument.id);
  });

  it("does not download a file stored on an entity the member cannot read", async () => {
    const member = memberWith(["customers.read"]);

    await expect(
      service.downloadFile(member, caseDocument.storageKey, {} as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects a storage key outside the caller organization before looking the file up", async () => {
    const member = memberWith(["cases.read"]);

    await expect(
      service.downloadFile(member, "org-2/case/case-1/secret.pdf", {} as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(documents.findActiveByStorageKey).not.toHaveBeenCalled();
  });

  it("hides a missing document as not found", async () => {
    documents.findActiveById.mockResolvedValue(null);
    const member = memberWith(["cases.read"]);

    await expect(service.getDownloadUrl(member, caseDocument.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("rejects an unknown document entity type", async () => {
    const member = memberWith(["cases.read"]);

    await expect(service.listByEntity(member, "invoice" as never, "inv-1")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("lets an organization admin read and write without an explicit grant", async () => {
    await expect(service.listByEntity(admin, "case", "case-1")).resolves.toEqual([caseDocument]);
    expect(permissions.resolveEffectivePermissions).not.toHaveBeenCalled();
  });
});
