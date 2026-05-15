import { Test, TestingModule } from "@nestjs/testing";
import { DocumentsController } from "../documents.controller";
import { AbstractDocumentsGatewayService } from "../../../domain/ports/documents.service.port";
import { JwtAuthGuard } from "../../../infrastructure/jwt-auth.guard";
import { RequirePermissionGuard } from "../../../infrastructure/require-permission.guard";
import { SubscriptionAccessGuard } from "../../../infrastructure/subscription-access.guard";
import type { AuthUser, DocumentEntityType } from "@syncora/shared";
import type { Response } from "express";

describe("DocumentsController", () => {
  let controller: DocumentsController;
  let mockDocumentsService: jest.Mocked<AbstractDocumentsGatewayService>;

  const mockUser: AuthUser = {
    id: "user-123",
    email: "admin@example.com",
    organizationId: "org-123",
    role: "admin",
    status: "active",
    permissions: [],
    name: "Admin User",
  };

  beforeEach(async () => {
    mockDocumentsService = {
      upload: jest.fn(),
      downloadFile: jest.fn(),
      getDownloadUrl: jest.fn(),
      deleteDocument: jest.fn(),
      listByEntity: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        {
          provide: AbstractDocumentsGatewayService,
          useValue: mockDocumentsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(SubscriptionAccessGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RequirePermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DocumentsController>(DocumentsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("upload", () => {
    it("should call documentsService.upload with user, entityType, entityId and file", async () => {
      const entityType = "case" as DocumentEntityType;
      const entityId = "case-1";
      const file = { originalname: "report.pdf", size: 1024 } as Express.Multer.File;
      mockDocumentsService.upload.mockResolvedValue({ id: "doc-1", originalName: "report.pdf" } as never);

      const result = await controller.upload(mockUser, entityType, entityId, file);

      expect(mockDocumentsService.upload).toHaveBeenCalledWith(mockUser, entityType, entityId, file);
      expect(result).toEqual({ id: "doc-1", originalName: "report.pdf" });
    });
  });

  describe("downloadFile", () => {
    it("should call documentsService.downloadFile with user, key and res", async () => {
      const mockRes = {} as Response;
      mockDocumentsService.downloadFile.mockResolvedValue(undefined);

      await controller.downloadFile(mockUser, "files/report.pdf", mockRes);

      expect(mockDocumentsService.downloadFile).toHaveBeenCalledWith(mockUser, "files/report.pdf", mockRes);
    });
  });

  describe("getDownloadUrl", () => {
    it("should call documentsService.getDownloadUrl with user and documentId", async () => {
      mockDocumentsService.getDownloadUrl.mockResolvedValue({ url: "https://s3.example.com/doc-1" });

      const result = await controller.getDownloadUrl(mockUser, "doc-1");

      expect(mockDocumentsService.getDownloadUrl).toHaveBeenCalledWith(mockUser, "doc-1");
      expect(result).toEqual({ url: "https://s3.example.com/doc-1" });
    });
  });

  describe("deleteDocument", () => {
    it("should call documentsService.deleteDocument with user and documentId", async () => {
      mockDocumentsService.deleteDocument.mockResolvedValue({ deleted: true });

      const result = await controller.deleteDocument(mockUser, "doc-1");

      expect(mockDocumentsService.deleteDocument).toHaveBeenCalledWith(mockUser, "doc-1");
      expect(result).toEqual({ deleted: true });
    });
  });

  describe("listByEntity", () => {
    it("should call documentsService.listByEntity with user, entityType and entityId", async () => {
      const entityType = "case" as DocumentEntityType;
      mockDocumentsService.listByEntity.mockResolvedValue([{ id: "doc-1" }] as never);

      const result = await controller.listByEntity(mockUser, entityType, "case-1");

      expect(mockDocumentsService.listByEntity).toHaveBeenCalledWith(mockUser, entityType, "case-1");
      expect(result).toEqual([{ id: "doc-1" }]);
    });
  });
});
