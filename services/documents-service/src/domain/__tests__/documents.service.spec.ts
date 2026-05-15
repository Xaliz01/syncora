import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { NotFoundException } from "@nestjs/common";
import { activeDocumentFilter } from "@syncora/shared";
import { DocumentsService } from "../documents.service";
import { AbstractDocumentsService } from "../ports/documents.service.port";
import { AbstractStorageProvider } from "../../infrastructure/storage.port";

describe("DocumentsService", () => {
  let service: DocumentsService;
  let mockDocumentModel: {
    create: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
  };
  let mockStorage: jest.Mocked<AbstractStorageProvider>;

  const mockDocumentDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: { toString: () => "doc-123" },
    organizationId: "org-1",
    entityType: "case",
    entityId: "entity-1",
    originalName: "file.pdf",
    mimeType: "application/pdf",
    size: 1024,
    storageKey: "org-1/case/entity-1/uuid-file.pdf",
    uploadedBy: "user-1",
    get: jest.fn((key: string) => (key === "createdAt" ? new Date("2025-01-01") : undefined)),
    save: jest.fn().mockResolvedValue(undefined),
    deletedAt: null as Date | null,
    ...overrides,
  });

  beforeEach(async () => {
    const execMock = jest.fn();
    const findChain = {
      sort: jest.fn().mockReturnValue({ exec: execMock }),
    };

    mockDocumentModel = {
      create: jest.fn(),
      find: jest.fn().mockReturnValue(findChain),
      findOne: jest.fn().mockReturnValue({ exec: execMock }),
    };

    mockStorage = {
      upload: jest.fn().mockResolvedValue(undefined),
      getDownloadUrl: jest.fn().mockResolvedValue("https://example.com/download"),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: AbstractDocumentsService, useClass: DocumentsService },
        { provide: getModelToken("DocumentRecord"), useValue: mockDocumentModel },
        { provide: AbstractStorageProvider, useValue: mockStorage },
      ],
    }).compile();

    service = module.get<AbstractDocumentsService>(AbstractDocumentsService) as DocumentsService;
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("upload", () => {
    it("should generate key and create document", async () => {
      const doc = mockDocumentDoc();
      mockDocumentModel.create.mockResolvedValue(doc);

      const params = {
        organizationId: "org-1",
        entityType: "case" as const,
        entityId: "entity-1",
        uploadedBy: "user-1",
        originalName: "file.pdf",
        mimeType: "application/pdf",
        size: 1024,
        buffer: Buffer.from("test"),
      };

      const result = await service.upload(params);

      expect(mockStorage.upload).toHaveBeenCalledWith(
        expect.stringContaining("org-1/case/entity-1/"),
        params.buffer,
        "application/pdf",
      );
      expect(mockDocumentModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-1",
          entityType: "case",
          entityId: "entity-1",
          originalName: "file.pdf",
          mimeType: "application/pdf",
          size: 1024,
          uploadedBy: "user-1",
          storageKey: expect.stringContaining("org-1/case/entity-1/"),
        }),
      );
      expect(result.id).toBe("doc-123");
      expect(result.originalName).toBe("file.pdf");
    });
  });

  describe("listByEntity", () => {
    it("should return documents sorted", async () => {
      const docs = [mockDocumentDoc(), mockDocumentDoc({ _id: { toString: () => "doc-456" } })];
      mockDocumentModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(docs) }),
      });

      const result = await service.listByEntity("org-1", "case", "entity-1");

      expect(mockDocumentModel.find).toHaveBeenCalledWith({
        organizationId: "org-1",
        entityType: "case",
        entityId: "entity-1",
        ...activeDocumentFilter,
      });
      expect(result).toHaveLength(2);
    });
  });

  describe("getDownloadUrl", () => {
    it("should return url when found", async () => {
      const doc = mockDocumentDoc();
      mockDocumentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.getDownloadUrl("org-1", "doc-123");

      expect(mockDocumentModel.findOne).toHaveBeenCalledWith({
        _id: "doc-123",
        organizationId: "org-1",
        ...activeDocumentFilter,
      });
      expect(mockStorage.getDownloadUrl).toHaveBeenCalledWith(doc.storageKey);
      expect(result).toBe("https://example.com/download");
    });

    it("should throw NotFoundException when not found", async () => {
      mockDocumentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getDownloadUrl("org-1", "non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("deleteDocument", () => {
    it("should delete storage and soft-delete document", async () => {
      const doc = mockDocumentDoc();
      mockDocumentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.deleteDocument("org-1", "doc-123");

      expect(mockDocumentModel.findOne).toHaveBeenCalledWith({
        _id: "doc-123",
        organizationId: "org-1",
        ...activeDocumentFilter,
      });
      expect(mockStorage.delete).toHaveBeenCalledWith(doc.storageKey);
      expect(doc.deletedAt).toBeInstanceOf(Date);
      expect(doc.save).toHaveBeenCalled();
      expect(result).toEqual({ deleted: true });
    });

    it("should throw NotFoundException when not found", async () => {
      mockDocumentModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.deleteDocument("org-1", "non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
