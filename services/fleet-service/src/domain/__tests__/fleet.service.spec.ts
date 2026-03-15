import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { FleetService } from "../fleet.service";

describe("FleetService", () => {
  let service: FleetService;
  let mockVehicleModel: {
    create: jest.Mock;
    findOne: jest.Mock;
    findById: jest.Mock;
    find: jest.Mock;
    updateMany: jest.Mock;
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
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 })
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FleetService,
        { provide: getModelToken("Vehicle"), useValue: mockVehicleModel }
      ]
    }).compile();

    service = module.get<FleetService>(FleetService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createVehicle", () => {
    it("should check duplicate registrationNumber and create doc", async () => {
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
    it("should return sorted list for organization", async () => {
      const docs = [
        mockVehicleDoc(),
        mockVehicleDoc({ _id: { toString: () => "vehicle-456" } })
      ];
      mockVehicleModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(docs) })
      });

      const result = await service.listVehicles("org-1");

      expect(mockVehicleModel.find).toHaveBeenCalledWith({ organizationId: "org-1" });
      expect(mockVehicleModel.find().sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toHaveLength(2);
    });
  });

  describe("deleteVehicle", () => {
    it("should delete vehicle when found and org matches", async () => {
      const doc = mockVehicleDoc({ organizationId: "org-1" });
      mockVehicleModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc)
      });

      const result = await service.deleteVehicle("org-1", "vehicle-123");

      expect(mockVehicleModel.findById).toHaveBeenCalledWith("vehicle-123");
      expect(doc.deleteOne).toHaveBeenCalled();
      expect(result).toEqual({ deleted: true });
    });

    it("should throw NotFoundException when vehicle not found", async () => {
      mockVehicleModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      await expect(service.deleteVehicle("org-1", "non-existent")).rejects.toThrow(
        NotFoundException
      );
    });

    it("should throw NotFoundException when org does not match", async () => {
      const doc = mockVehicleDoc({ organizationId: "other-org" });
      mockVehicleModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc)
      });

      await expect(service.deleteVehicle("org-1", "vehicle-123")).rejects.toThrow(
        NotFoundException
      );
    });
  });

});
