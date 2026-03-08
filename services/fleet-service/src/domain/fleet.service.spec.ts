import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { ConflictException, NotFoundException, BadRequestException } from "@nestjs/common";
import { FleetService } from "./fleet.service";
import { AbstractFleetService } from "./ports/fleet.service.port";

describe("FleetService", () => {
  let service: FleetService;
  let mockVehicleModel: {
    create: jest.Mock;
    findOne: jest.Mock;
    findById: jest.Mock;
    find: jest.Mock;
    updateMany: jest.Mock;
    updateOne: jest.Mock;
  };
  let mockTechnicianModel: {
    create: jest.Mock;
    findOne: jest.Mock;
    findById: jest.Mock;
    find: jest.Mock;
    updateMany: jest.Mock;
    updateOne: jest.Mock;
  };

  const mockVehicleDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: { toString: () => "vehicle-123" },
    organizationId: "org-1",
    registrationNumber: "AB-123-CD",
    type: "voiture",
    vehicleModel: "Model X",
    brand: "Brand",
    year: 2020,
    color: "red",
    vin: "VIN123",
    mileage: 10000,
    status: "actif",
    assignedTechnicianId: undefined,
    get: jest.fn((key: string) =>
      key === "createdAt" ? new Date("2025-01-01") : key === "updatedAt" ? new Date("2025-01-02") : undefined
    ),
    save: jest.fn().mockResolvedValue(undefined),
    deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    ...overrides
  });

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
    assignedVehicleIds: [],
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

    mockVehicleModel = {
      create: jest.fn(),
      findOne: jest.fn().mockReturnValue({ exec: execMock }),
      findById: jest.fn().mockReturnValue({ exec: execMock }),
      find: jest.fn().mockReturnValue(findChain),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 })
    };

    mockTechnicianModel = {
      create: jest.fn(),
      findOne: jest.fn().mockReturnValue({ exec: execMock }),
      findById: jest.fn().mockReturnValue({ exec: execMock }),
      find: jest.fn().mockReturnValue(findChain),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 })
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: AbstractFleetService, useClass: FleetService },
        { provide: getModelToken("Vehicle"), useValue: mockVehicleModel },
        { provide: getModelToken("Technician"), useValue: mockTechnicianModel }
      ]
    }).compile();

    service = module.get<AbstractFleetService>(AbstractFleetService) as FleetService;
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createVehicle", () => {
    it("should create a vehicle when registration number is unique", async () => {
      mockVehicleModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      const doc = mockVehicleDoc();
      mockVehicleModel.create.mockResolvedValue(doc);

      const body = {
        organizationId: "org-1",
        registrationNumber: "AB-123-CD",
        type: "voiture" as const,
        brand: "Brand",
        model: "Model X",
        year: 2020,
        color: "red",
        vin: "VIN123",
        mileage: 10000
      };

      const result = await service.createVehicle(body);

      expect(mockVehicleModel.findOne).toHaveBeenCalledWith({
        organizationId: "org-1",
        registrationNumber: "AB-123-CD"
      });
      expect(mockVehicleModel.create).toHaveBeenCalled();
      expect(result.id).toBe("vehicle-123");
      expect(result.registrationNumber).toBe("AB-123-CD");
    });

    it("should throw ConflictException when registration number already exists", async () => {
      mockVehicleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockVehicleDoc())
      });

      const body = {
        organizationId: "org-1",
        registrationNumber: "AB-123-CD",
        type: "voiture" as const,
        brand: "Brand",
        model: "Model X",
        year: 2020
      };

      await expect(service.createVehicle(body)).rejects.toThrow(ConflictException);
      expect(mockVehicleModel.create).not.toHaveBeenCalled();
    });
  });

  describe("getVehicle", () => {
    it("should return vehicle when found and org matches", async () => {
      const doc = mockVehicleDoc({ organizationId: "org-1" });
      mockVehicleModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc)
      });

      const result = await service.getVehicle("org-1", "vehicle-123");

      expect(mockVehicleModel.findById).toHaveBeenCalledWith("vehicle-123");
      expect(result.id).toBe("vehicle-123");
    });

    it("should throw NotFoundException when vehicle not found", async () => {
      mockVehicleModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      await expect(service.getVehicle("org-1", "non-existent")).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when org does not match", async () => {
      const doc = mockVehicleDoc({ organizationId: "other-org" });
      mockVehicleModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc)
      });

      await expect(service.getVehicle("org-1", "vehicle-123")).rejects.toThrow(NotFoundException);
    });
  });

  describe("listVehicles", () => {
    it("should return vehicles for organization", async () => {
      const docs = [mockVehicleDoc(), mockVehicleDoc({ _id: { toString: () => "vehicle-456" } })];
      mockVehicleModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(docs) })
      });

      const result = await service.listVehicles("org-1");

      expect(mockVehicleModel.find).toHaveBeenCalledWith({ organizationId: "org-1" });
      expect(result).toHaveLength(2);
    });
  });

  describe("deleteVehicle", () => {
    it("should delete vehicle and unlink technician when assigned", async () => {
      const doc = mockVehicleDoc({ assignedTechnicianId: "tech-123" });
      mockVehicleModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc)
      });

      const result = await service.deleteVehicle("org-1", "vehicle-123");

      expect(mockTechnicianModel.updateOne).toHaveBeenCalledWith(
        { _id: "tech-123" },
        { $pull: { assignedVehicleIds: "vehicle-123" } }
      );
      expect(doc.deleteOne).toHaveBeenCalled();
      expect(result).toEqual({ deleted: true });
    });

    it("should throw NotFoundException when vehicle not found", async () => {
      mockVehicleModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      await expect(service.deleteVehicle("org-1", "non-existent")).rejects.toThrow(NotFoundException);
    });
  });

  describe("createTechnician", () => {
    it("should create a technician", async () => {
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

      expect(mockTechnicianModel.create).toHaveBeenCalled();
      expect(result.id).toBe("tech-123");
      expect(result.firstName).toBe("John");
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
  });

  describe("listTechnicians", () => {
    it("should return technicians for organization", async () => {
      const docs = [mockTechnicianDoc(), mockTechnicianDoc({ _id: { toString: () => "tech-456" } })];
      mockTechnicianModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(docs) })
      });

      const result = await service.listTechnicians("org-1");

      expect(mockTechnicianModel.find).toHaveBeenCalledWith({ organizationId: "org-1" });
      expect(result).toHaveLength(2);
    });
  });

  describe("linkUserToTechnician", () => {
    it("should link user to technician when technician has no userId", async () => {
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
