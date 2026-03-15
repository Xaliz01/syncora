import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { TechniciansService } from "../technicians.service";

describe("TechniciansService", () => {
  let service: TechniciansService;
  let mockTechnicianModel: {
    create: jest.Mock;
    findOne: jest.Mock;
    findById: jest.Mock;
    find: jest.Mock;
  };

  const mockTechnicianDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: { toString: () => "tech-123" },
    organizationId: "org-1",
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    phone: "+33123456789",
    speciality: "mechanic",
    status: "actif",
    userId: undefined,
    get: jest.fn((key: string) =>
      key === "createdAt" ? new Date("2025-01-01") : key === "updatedAt" ? new Date("2025-01-02") : undefined
    ),
    save: jest.fn().mockResolvedValue(undefined),
    deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    ...overrides
  });

  beforeEach(async () => {
    const execMock = jest.fn();
    const findChain = {
      sort: jest.fn().mockReturnValue({ exec: execMock })
    };

    mockTechnicianModel = {
      create: jest.fn(),
      findOne: jest.fn().mockReturnValue({ exec: execMock }),
      findById: jest.fn().mockReturnValue({ exec: execMock }),
      find: jest.fn().mockReturnValue(findChain)
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TechniciansService,
        { provide: getModelToken("Technician"), useValue: mockTechnicianModel }
      ]
    }).compile();

    service = module.get<TechniciansService>(TechniciansService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createTechnician", () => {
    it("should create doc and return response", async () => {
      const doc = mockTechnicianDoc();
      mockTechnicianModel.create.mockResolvedValue(doc);

      const body = {
        organizationId: "org-1",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        phone: "+33123456789",
        speciality: "mechanic"
      };

      const result = await service.createTechnician(body);

      expect(mockTechnicianModel.create).toHaveBeenCalledWith({
        organizationId: body.organizationId,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        speciality: body.speciality,
        status: "actif"
      });
      expect(result.id).toBe("tech-123");
      expect(result.firstName).toBe("John");
      expect(result.organizationId).toBe("org-1");
      expect(result.lastName).toBe("Doe");
      expect(result.email).toBe("john@example.com");
      expect(result.phone).toBe("+33123456789");
      expect(result.speciality).toBe("mechanic");
      expect(result.status).toBe("actif");
      expect(result.userId).toBeUndefined();
    });
  });

  describe("getTechnician", () => {
    it("should return technician when found and org matches", async () => {
      const doc = mockTechnicianDoc({ organizationId: "org-1" });
      mockTechnicianModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc)
      });

      const result = await service.getTechnician("org-1", "tech-123");

      expect(mockTechnicianModel.findById).toHaveBeenCalledWith("tech-123");
      expect(result.id).toBe("tech-123");
    });

    it("should throw NotFoundException when technician not found", async () => {
      mockTechnicianModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      await expect(service.getTechnician("org-1", "non-existent")).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when org does not match", async () => {
      const doc = mockTechnicianDoc({ organizationId: "other-org" });
      mockTechnicianModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc)
      });

      await expect(service.getTechnician("org-1", "tech-123")).rejects.toThrow(NotFoundException);
    });
  });

  describe("listTechnicians", () => {
    it("should return sorted list for organization", async () => {
      const docs = [
        mockTechnicianDoc(),
        mockTechnicianDoc({ _id: { toString: () => "tech-456" } })
      ];
      mockTechnicianModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(docs) })
      });

      const result = await service.listTechnicians("org-1");

      expect(mockTechnicianModel.find).toHaveBeenCalledWith({ organizationId: "org-1" });
      expect(mockTechnicianModel.find().sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toHaveLength(2);
    });
  });

  describe("deleteTechnician", () => {
    it("should delete technician when found and org matches", async () => {
      const doc = mockTechnicianDoc({ organizationId: "org-1" });
      mockTechnicianModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc)
      });

      const result = await service.deleteTechnician("org-1", "tech-123");

      expect(mockTechnicianModel.findById).toHaveBeenCalledWith("tech-123");
      expect(doc.deleteOne).toHaveBeenCalled();
      expect(result).toEqual({ deleted: true });
    });

    it("should throw NotFoundException when technician not found", async () => {
      mockTechnicianModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      await expect(service.deleteTechnician("org-1", "non-existent")).rejects.toThrow(
        NotFoundException
      );
    });

    it("should throw NotFoundException when org does not match", async () => {
      const doc = mockTechnicianDoc({ organizationId: "other-org" });
      mockTechnicianModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc)
      });

      await expect(service.deleteTechnician("org-1", "tech-123")).rejects.toThrow(NotFoundException);
    });
  });

  describe("linkUserToTechnician", () => {
    it("should link user when technician has no userId", async () => {
      const doc = mockTechnicianDoc({ userId: undefined });
      mockTechnicianModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc)
      });

      const result = await service.linkUserToTechnician("org-1", "tech-123", "user-456");

      expect(doc.userId).toBe("user-456");
      expect(doc.save).toHaveBeenCalled();
      expect(result.userId).toBe("user-456");
    });

    it("should throw BadRequestException when technician already has userId", async () => {
      const doc = mockTechnicianDoc({ userId: "existing-user" });
      mockTechnicianModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc)
      });

      await expect(
        service.linkUserToTechnician("org-1", "tech-123", "user-456")
      ).rejects.toThrow(BadRequestException);
      expect(doc.save).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException when technician not found", async () => {
      mockTechnicianModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      await expect(
        service.linkUserToTechnician("org-1", "non-existent", "user-456")
      ).rejects.toThrow(NotFoundException);
    });
  });

});
