import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { AgencesService } from "../agences.service";

describe("AgencesService", () => {
  let service: AgencesService;
  let mockAgenceModel: {
    create: jest.Mock;
    findById: jest.Mock;
    find: jest.Mock;
  };

  const mockAgenceDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: { toString: () => "agence-123" },
    organizationId: "org-1",
    name: "Agence Paris",
    address: "10 rue de Rivoli",
    city: "Paris",
    postalCode: "75001",
    phone: "+33100000000",
    get: jest.fn((key: string) =>
      key === "createdAt"
        ? new Date("2025-01-01")
        : key === "updatedAt"
          ? new Date("2025-01-02")
          : undefined,
    ),
    save: jest.fn().mockResolvedValue(undefined),
    deleteOne: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  beforeEach(async () => {
    const execMock = jest.fn();

    mockAgenceModel = {
      create: jest.fn(),
      findById: jest.fn().mockReturnValue({ exec: execMock }),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({ exec: execMock }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgencesService,
        { provide: getModelToken("Agence"), useValue: mockAgenceModel },
      ],
    }).compile();

    service = module.get<AgencesService>(AgencesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createAgence", () => {
    it("should create agence and return response", async () => {
      const doc = mockAgenceDoc();
      mockAgenceModel.create.mockResolvedValue(doc);

      const body = {
        organizationId: "org-1",
        name: "Agence Paris",
        address: "10 rue de Rivoli",
        city: "Paris",
        postalCode: "75001",
        phone: "+33100000000",
      };

      const result = await service.createAgence(body);

      expect(mockAgenceModel.create).toHaveBeenCalledWith({
        organizationId: "org-1",
        name: "Agence Paris",
        address: "10 rue de Rivoli",
        city: "Paris",
        postalCode: "75001",
        phone: "+33100000000",
      });
      expect(result.id).toBe("agence-123");
      expect(result.name).toBe("Agence Paris");
      expect(result.organizationId).toBe("org-1");
    });

    it("should throw ConflictException on duplicate (code 11000)", async () => {
      mockAgenceModel.create.mockRejectedValue({ code: 11000 });

      const body = {
        organizationId: "org-1",
        name: "Agence Paris",
      };

      await expect(service.createAgence(body)).rejects.toThrow(ConflictException);
    });
  });

  describe("updateAgence", () => {
    it("should update fields and save", async () => {
      const doc = mockAgenceDoc();
      mockAgenceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.updateAgence("org-1", "agence-123", {
        name: "Agence Lyon",
      });

      expect(doc.name).toBe("Agence Lyon");
      expect(doc.save).toHaveBeenCalled();
      expect(result.id).toBe("agence-123");
    });

    it("should throw NotFoundException when not found", async () => {
      mockAgenceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.updateAgence("org-1", "non-existent", { name: "Test" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when org mismatch", async () => {
      const doc = mockAgenceDoc({ organizationId: "org-2" });
      mockAgenceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      await expect(
        service.updateAgence("org-1", "agence-123", { name: "Test" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getAgence", () => {
    it("should return agence when found", async () => {
      const doc = mockAgenceDoc();
      mockAgenceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.getAgence("org-1", "agence-123");

      expect(mockAgenceModel.findById).toHaveBeenCalledWith("agence-123");
      expect(result.id).toBe("agence-123");
      expect(result.name).toBe("Agence Paris");
    });

    it("should throw NotFoundException when not found", async () => {
      mockAgenceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getAgence("org-1", "non-existent")).rejects.toThrow(NotFoundException);
    });
  });

  describe("listAgences", () => {
    it("should return sorted list for organization", async () => {
      const docs = [
        mockAgenceDoc(),
        mockAgenceDoc({ _id: { toString: () => "agence-456" }, name: "Agence Lyon" }),
      ];
      mockAgenceModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(docs) }),
      });

      const result = await service.listAgences("org-1");

      expect(mockAgenceModel.find).toHaveBeenCalledWith({ organizationId: "org-1" });
      expect(mockAgenceModel.find().sort).toHaveBeenCalledWith({ name: 1 });
      expect(result).toHaveLength(2);
    });
  });

  describe("deleteAgence", () => {
    it("should delete agence when found", async () => {
      const doc = mockAgenceDoc();
      mockAgenceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.deleteAgence("org-1", "agence-123");

      expect(doc.deleteOne).toHaveBeenCalled();
      expect(result).toEqual({ deleted: true });
    });

    it("should throw NotFoundException when not found", async () => {
      mockAgenceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.deleteAgence("org-1", "non-existent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
