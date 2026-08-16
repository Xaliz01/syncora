import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { StockLocationService } from "../stock-location.service";

describe("StockLocationService", () => {
  let service: StockLocationService;
  let mockStockLocationModel: {
    create: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    deleteMany: jest.Mock;
  };
  let mockArticleModel: {
    countDocuments: jest.Mock;
    updateMany: jest.Mock;
  };

  const mockLocationDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: { toString: () => "loc-123" },
    organizationId: "org-1",
    name: "Entrepôt principal",
    type: "warehouse",
    isDefault: true,
    get: jest.fn((key: string) =>
      key === "createdAt"
        ? new Date("2025-01-01")
        : key === "updatedAt"
          ? new Date("2025-01-02")
          : undefined,
    ),
    ...overrides,
  });

  beforeEach(async () => {
    const locationExecMock = jest.fn();
    const locationSortExecMock = jest.fn();

    mockStockLocationModel = {
      create: jest.fn(),
      findOne: jest.fn().mockReturnValue({ exec: locationExecMock }),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({ exec: locationSortExecMock }),
      }),
      deleteMany: jest.fn().mockReturnValue({ exec: jest.fn() }),
    };

    mockArticleModel = {
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
      updateMany: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockLocationService,
        { provide: getModelToken("StockLocation"), useValue: mockStockLocationModel },
        { provide: getModelToken("Article"), useValue: mockArticleModel },
      ],
    }).compile();

    service = module.get<StockLocationService>(StockLocationService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createStockLocation", () => {
    it("should create a warehouse location successfully", async () => {
      mockStockLocationModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      const doc = mockLocationDoc();
      mockStockLocationModel.create.mockResolvedValue(doc);

      const result = await service.createStockLocation({
        organizationId: "org-1",
        name: "Entrepôt principal",
        type: "warehouse",
      });

      expect(result.id).toBe("loc-123");
      expect(result.name).toBe("Entrepôt principal");
      expect(result.type).toBe("warehouse");
      expect(result.isDefault).toBe(true);
    });

    it("should throw BadRequestException when name is empty", async () => {
      await expect(
        service.createStockLocation({
          organizationId: "org-1",
          name: "  ",
          type: "warehouse",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for agence type without referenceId", async () => {
      await expect(
        service.createStockLocation({
          organizationId: "org-1",
          name: "Agence Nord",
          type: "agence",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for vehicle type without referenceId", async () => {
      await expect(
        service.createStockLocation({
          organizationId: "org-1",
          name: "Camion 1",
          type: "vehicle",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw ConflictException on duplicate name", async () => {
      mockStockLocationModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      mockStockLocationModel.create.mockRejectedValue({ code: 11000 });

      await expect(
        service.createStockLocation({
          organizationId: "org-1",
          name: "Duplicate",
          type: "warehouse",
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("listStockLocations", () => {
    it("should list locations sorted by default first then name", async () => {
      const docs = [
        {
          _id: { toString: () => "loc-1" },
          organizationId: "org-1",
          name: "Entrepôt",
          type: "warehouse",
          isDefault: true,
          isTestData: false,
          get: jest.fn(() => new Date()),
        },
        {
          _id: { toString: () => "loc-2" },
          organizationId: "org-1",
          name: "Camion A",
          type: "vehicle",
          referenceId: "veh-1",
          isDefault: false,
          isTestData: false,
          get: jest.fn(() => new Date()),
        },
      ];
      mockStockLocationModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(docs) }),
      });

      const result = await service.listStockLocations("org-1");

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Entrepôt");
      expect(result[1].name).toBe("Camion A");
    });
  });

  describe("getStockLocation", () => {
    it("should return a location by id", async () => {
      const doc = {
        _id: { toString: () => "loc-1" },
        organizationId: "org-1",
        name: "Entrepôt",
        type: "warehouse",
        isDefault: true,
        isTestData: false,
        get: jest.fn(() => new Date()),
      };
      mockStockLocationModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.getStockLocation("loc-1", "org-1");

      expect(result.id).toBe("loc-1");
      expect(result.name).toBe("Entrepôt");
    });

    it("should throw NotFoundException when location not found", async () => {
      mockStockLocationModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getStockLocation("unknown", "org-1")).rejects.toThrow(NotFoundException);
    });
  });

  describe("deleteStockLocation", () => {
    it("should throw NotFoundException when location not found", async () => {
      mockStockLocationModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.deleteStockLocation("unknown", "org-1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException when deleting default location", async () => {
      const doc = {
        _id: { toString: () => "loc-1" },
        organizationId: "org-1",
        name: "Default",
        type: "warehouse",
        isDefault: true,
      };
      mockStockLocationModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      await expect(service.deleteStockLocation("loc-1", "org-1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should soft-delete a non-default empty location", async () => {
      const doc = {
        _id: { toString: () => "loc-1" },
        organizationId: "org-1",
        name: "Secondary",
        type: "warehouse",
        isDefault: false,
        deletedAt: null as Date | null,
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockStockLocationModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });
      mockArticleModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });
      mockArticleModel.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 0 });

      const result = await service.deleteStockLocation("loc-1", "org-1");

      expect(doc.deletedAt).toEqual(expect.any(Date));
      expect(doc.save).toHaveBeenCalled();
      expect(result).toEqual({ deleted: true });
    });
  });
});
