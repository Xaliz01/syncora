import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { DocumentsController } from "../documents.controller";
import { AbstractDocumentsService } from "../../../domain/ports/documents.service.port";
import { AbstractStorageProvider } from "../../../infrastructure/storage.port";

describe("DocumentsController", () => {
  let controller: DocumentsController;
  let mockDocumentsService: jest.Mocked<AbstractDocumentsService>;
  let mockStorage: jest.Mocked<AbstractStorageProvider>;

  beforeEach(async () => {
    mockDocumentsService = {
      upload: jest.fn(),
      listByEntity: jest.fn(),
      getDownloadUrl: jest.fn(),
      deleteDocument: jest.fn(),
    };

    mockStorage = {
      upload: jest.fn(),
      getDownloadUrl: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        {
          provide: AbstractDocumentsService,
          useValue: mockDocumentsService,
        },
        {
          provide: AbstractStorageProvider,
          useValue: mockStorage,
        },
      ],
    }).compile();

    controller = module.get<DocumentsController>(DocumentsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("upload", () => {
    const mockFile = {
      originalname: "file.pdf",
      mimetype: "application/pdf",
      size: 1024,
      buffer: Buffer.from("test"),
    } as Express.Multer.File;

    it("should delegate to service with proper params", async () => {
      mockDocumentsService.upload.mockResolvedValue({ id: "doc-1" } as never);

      const result = await controller.upload(mockFile, "org-1", "case", "entity-1", "user-1");

      expect(mockDocumentsService.upload).toHaveBeenCalledWith({
        organizationId: "org-1",
        entityType: "case",
        entityId: "entity-1",
        uploadedBy: "user-1",
        originalName: "file.pdf",
        mimeType: "application/pdf",
        size: 1024,
        buffer: mockFile.buffer,
      });
      expect(result.id).toBe("doc-1");
    });

    it("should throw BadRequestException without file", async () => {
      await expect(
        controller.upload(undefined as never, "org-1", "case", "entity-1", "user-1"),
      ).rejects.toThrow(BadRequestException);
      expect(mockDocumentsService.upload).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException without organizationId", async () => {
      await expect(
        controller.upload(mockFile, undefined as never, "case", "entity-1", "user-1"),
      ).rejects.toThrow(BadRequestException);
      expect(mockDocumentsService.upload).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException with invalid entityType", async () => {
      await expect(
        controller.upload(mockFile, "org-1", "invalid", "entity-1", "user-1"),
      ).rejects.toThrow(BadRequestException);
      expect(mockDocumentsService.upload).not.toHaveBeenCalled();
    });
  });

  describe("listByEntity", () => {
    it("should delegate to service", async () => {
      mockDocumentsService.listByEntity.mockResolvedValue([{ id: "doc-1" }] as never);

      const result = await controller.listByEntity("org-1", "case", "entity-1");

      expect(mockDocumentsService.listByEntity).toHaveBeenCalledWith("org-1", "case", "entity-1");
      expect(result).toHaveLength(1);
    });

    it("should throw BadRequestException without organizationId", async () => {
      await expect(controller.listByEntity(undefined as never, "case", "entity-1")).rejects.toThrow(
        BadRequestException,
      );
      expect(mockDocumentsService.listByEntity).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException with invalid entityType", async () => {
      await expect(controller.listByEntity("org-1", "invalid", "entity-1")).rejects.toThrow(
        BadRequestException,
      );
      expect(mockDocumentsService.listByEntity).not.toHaveBeenCalled();
    });
  });

  describe("getDownloadUrl", () => {
    it("should return { url } from service", async () => {
      mockDocumentsService.getDownloadUrl.mockResolvedValue("https://example.com/download");

      const result = await controller.getDownloadUrl("doc-1", "org-1");

      expect(mockDocumentsService.getDownloadUrl).toHaveBeenCalledWith("org-1", "doc-1");
      expect(result).toEqual({ url: "https://example.com/download" });
    });

    it("should throw BadRequestException without organizationId", async () => {
      await expect(controller.getDownloadUrl("doc-1", undefined as never)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockDocumentsService.getDownloadUrl).not.toHaveBeenCalled();
    });
  });

  describe("deleteDocument", () => {
    it("should delegate to service", async () => {
      mockDocumentsService.deleteDocument.mockResolvedValue({ deleted: true } as never);

      const result = await controller.deleteDocument("doc-1", "org-1");

      expect(mockDocumentsService.deleteDocument).toHaveBeenCalledWith("org-1", "doc-1");
      expect(result).toEqual({ deleted: true });
    });

    it("should throw BadRequestException without organizationId", async () => {
      await expect(controller.deleteDocument("doc-1", undefined as never)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockDocumentsService.deleteDocument).not.toHaveBeenCalled();
    });
  });
});
