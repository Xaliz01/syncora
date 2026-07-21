import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { activeDocumentFilter } from "@planwise/shared";
import { StockService } from "../stock.service";

describe("StockService", () => {
  let service: StockService;
  let mockArticleModel: {
    create: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    findOneAndUpdate: jest.Mock;
    countDocuments: jest.Mock;
  };
  let mockStockMovementModel: {
    create: jest.Mock;
    find: jest.Mock;
  };
  let mockStockLocationModel: {
    create: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    deleteMany: jest.Mock;
  };

  const mockArticleDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: { toString: () => "article-123" },
    organizationId: "org-1",
    name: "Article A",
    reference: "REF-001",
    description: "Description",
    unit: "unité",
    stockQuantity: 10,
    reorderPoint: 5,
    targetStock: 20,
    isActive: true,
    lastMovementAt: new Date("2025-01-01"),
    get: jest.fn((key: string) =>
      key === "createdAt"
        ? new Date("2025-01-01")
        : key === "updatedAt"
          ? new Date("2025-01-02")
          : undefined,
    ),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  });

  const mockStockMovementDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: { toString: () => "movement-123" },
    organizationId: "org-1",
    articleId: "article-123",
    articleName: "Article A",
    articleReference: "REF-001",
    movementType: "in",
    quantity: 10,
    previousStock: 0,
    newStock: 10,
    reason: "initial_stock",
    get: jest.fn((key: string) => (key === "createdAt" ? new Date("2025-01-01") : undefined)),
    ...overrides,
  });

  beforeEach(async () => {
    const execMock = jest.fn();
    const sortExecMock = jest.fn();
    const limitExecMock = jest.fn();

    mockArticleModel = {
      create: jest.fn(),
      findOne: jest.fn().mockReturnValue({ exec: execMock }),
      find: jest.fn().mockReturnValue({ sort: jest.fn().mockReturnValue({ exec: sortExecMock }) }),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: execMock }),
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
    };

    mockStockMovementModel = {
      create: jest.fn(),
      find: jest.fn().mockReturnValue({
        sort: jest
          .fn()
          .mockReturnValue({ limit: jest.fn().mockReturnValue({ exec: limitExecMock }) }),
      }),
    };

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockService,
        { provide: getModelToken("Article"), useValue: mockArticleModel },
        { provide: getModelToken("StockMovement"), useValue: mockStockMovementModel },
        { provide: getModelToken("StockLocation"), useValue: mockStockLocationModel },
      ],
    }).compile();

    service = module.get<StockService>(StockService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createArticle", () => {
    it("should create article successfully without initial stock", async () => {
      const doc = mockArticleDoc();
      mockArticleModel.create.mockResolvedValue(doc);

      const body = {
        organizationId: "org-1",
        name: "Article A",
        reference: "REF-001",
        description: "Description",
        unit: "unité",
      };

      const result = await service.createArticle(body);

      expect(mockArticleModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-1",
          name: "Article A",
          reference: "REF-001",
          stockQuantity: 0,
          reorderPoint: 0,
          targetStock: 0,
          isActive: true,
        }),
      );
      expect(mockStockMovementModel.create).not.toHaveBeenCalled();
      expect(result.id).toBe("article-123");
      expect(result.name).toBe("Article A");
      expect(result.reference).toBe("REF-001");
    });

    it("should create article with initial stock and create stock movement", async () => {
      const doc = mockArticleDoc({
        name: "Article B",
        reference: "REF-002",
        stockQuantity: 15,
        lastMovementAt: new Date("2025-01-01"),
      });
      mockArticleModel.create.mockResolvedValue(doc);
      mockStockMovementModel.create.mockResolvedValue(mockStockMovementDoc());

      const body = {
        organizationId: "org-1",
        name: "Article B",
        reference: "REF-002",
        initialStock: 15,
        reorderPoint: 5,
        targetStock: 30,
      };

      const result = await service.createArticle(body);

      expect(mockArticleModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-1",
          name: "Article B",
          reference: "REF-002",
          stockQuantity: 15,
          reorderPoint: 5,
          targetStock: 30,
        }),
      );
      expect(mockStockMovementModel.create).toHaveBeenCalledWith({
        organizationId: "org-1",
        articleId: "article-123",
        articleName: "Article B",
        articleReference: "REF-002",
        movementType: "in",
        quantity: 15,
        previousStock: 0,
        newStock: 15,
        reason: "initial_stock",
      });
      expect(result.id).toBe("article-123");
    });

    it("should throw BadRequestException for empty name", async () => {
      const body = {
        organizationId: "org-1",
        name: "",
        reference: "REF-001",
      };

      await expect(service.createArticle(body)).rejects.toThrow(BadRequestException);
      await expect(service.createArticle(body)).rejects.toThrow("Article name is required");
      expect(mockArticleModel.create).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException for empty reference", async () => {
      const body = {
        organizationId: "org-1",
        name: "Article A",
        reference: "   ",
      };

      await expect(service.createArticle(body)).rejects.toThrow(BadRequestException);
      await expect(service.createArticle(body)).rejects.toThrow("Article reference is required");
      expect(mockArticleModel.create).not.toHaveBeenCalled();
    });

    it("should throw ConflictException for duplicate reference (code 11000)", async () => {
      mockArticleModel.create.mockRejectedValue({ code: 11000 });

      const body = {
        organizationId: "org-1",
        name: "Article A",
        reference: "REF-001",
      };

      await expect(service.createArticle(body)).rejects.toThrow(ConflictException);
      await expect(service.createArticle(body)).rejects.toThrow(
        "An article with this reference already exists",
      );
    });

    it("should create article with defaultPrice", async () => {
      const doc = mockArticleDoc({ defaultPrice: 49.99 });
      mockArticleModel.create.mockResolvedValue(doc);

      const body = {
        organizationId: "org-1",
        name: "Article C",
        reference: "REF-003",
        defaultPrice: 49.99,
      };

      const result = await service.createArticle(body);

      expect(mockArticleModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultPrice: 49.99,
        }),
      );
      expect(result.defaultPrice).toBe(49.99);
    });

    it("should create article without defaultPrice when not provided", async () => {
      const doc = mockArticleDoc();
      mockArticleModel.create.mockResolvedValue(doc);

      const body = {
        organizationId: "org-1",
        name: "Article D",
        reference: "REF-004",
      };

      await service.createArticle(body);

      expect(mockArticleModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultPrice: undefined,
        }),
      );
    });

    it("should throw BadRequestException for negative defaultPrice", async () => {
      const body = {
        organizationId: "org-1",
        name: "Article E",
        reference: "REF-005",
        defaultPrice: -10,
      };

      await expect(service.createArticle(body)).rejects.toThrow(BadRequestException);
    });
  });

  describe("listArticles", () => {
    it("should build query and return paginated list", async () => {
      const docs = [mockArticleDoc(), mockArticleDoc({ _id: { toString: () => "article-456" } })];
      mockArticleModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(2),
      });
      mockArticleModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(docs) }),
          }),
        }),
      });

      const result = await service.listArticles("org-1", { search: "test", lowStockOnly: true });

      expect(mockArticleModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-1",
          ...activeDocumentFilter,
          isActive: true,
          $or: [
            { name: { $regex: "test", $options: "i" } },
            { reference: { $regex: "test", $options: "i" } },
          ],
          $expr: { $lte: ["$stockQuantity", "$reorderPoint"] },
        }),
      );
      expect(mockArticleModel.find().sort).toHaveBeenCalledWith({ name: 1 });
      expect(result.articles).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.articles[0].id).toBe("article-123");
    });
  });

  describe("getArticle", () => {
    it("should return article when found", async () => {
      const doc = mockArticleDoc();
      mockArticleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.getArticle("article-123", "org-1");

      expect(mockArticleModel.findOne).toHaveBeenCalledWith({
        _id: "article-123",
        organizationId: "org-1",
        ...activeDocumentFilter,
      });
      expect(result.id).toBe("article-123");
      expect(result.name).toBe("Article A");
    });

    it("should throw NotFoundException when article not found", async () => {
      mockArticleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getArticle("non-existent", "org-1")).rejects.toThrow(NotFoundException);
      await expect(service.getArticle("non-existent", "org-1")).rejects.toThrow(
        "Article not found",
      );
    });
  });

  describe("updateArticle", () => {
    it("should find, update fields and validate targetStock >= reorderPoint", async () => {
      const doc = mockArticleDoc({
        reorderPoint: 5,
        targetStock: 20,
        save: jest.fn().mockResolvedValue(undefined),
      });
      mockArticleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const body = {
        organizationId: "org-1",
        name: "Updated Article",
        reorderPoint: 10,
        targetStock: 25,
      };

      const result = await service.updateArticle("article-123", body);

      expect(mockArticleModel.findOne).toHaveBeenCalledWith({
        _id: "article-123",
        organizationId: "org-1",
        ...activeDocumentFilter,
      });
      expect(doc.name).toBe("Updated Article");
      expect(doc.reorderPoint).toBe(10);
      expect(doc.targetStock).toBe(25);
      expect(doc.save).toHaveBeenCalled();
      expect(result.name).toBe("Updated Article");
    });

    it("should throw BadRequestException when targetStock < reorderPoint", async () => {
      const doc = mockArticleDoc({ reorderPoint: 20, targetStock: 10 });
      mockArticleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const body = {
        organizationId: "org-1",
        targetStock: 5,
        reorderPoint: 10,
      };

      await expect(service.updateArticle("article-123", body)).rejects.toThrow(BadRequestException);
      await expect(service.updateArticle("article-123", body)).rejects.toThrow(
        "targetStock must be greater than or equal to reorderPoint",
      );
    });

    it("should update defaultPrice on article", async () => {
      const doc = mockArticleDoc() as ReturnType<typeof mockArticleDoc> & {
        defaultPrice?: number;
      };
      doc.defaultPrice = undefined;
      mockArticleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const body = {
        organizationId: "org-1",
        defaultPrice: 35.5,
      };

      const result = await service.updateArticle("article-123", body);

      expect(doc.defaultPrice).toBe(35.5);
      expect(doc.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should clear defaultPrice when set to null", async () => {
      const doc = mockArticleDoc() as ReturnType<typeof mockArticleDoc> & {
        defaultPrice?: number;
      };
      doc.defaultPrice = 50;
      mockArticleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const body = {
        organizationId: "org-1",
        defaultPrice: null,
      };

      const result = await service.updateArticle("article-123", body);

      expect(doc.defaultPrice).toBeUndefined();
      expect(result).toBeDefined();
    });
  });

  describe("deleteArticle", () => {
    it("should soft-delete article (set isActive: false and deletedAt)", async () => {
      const doc = mockArticleDoc({ isActive: false });
      mockArticleModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.deleteArticle("article-123", "org-1");

      expect(mockArticleModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: "article-123", organizationId: "org-1", ...activeDocumentFilter },
        { $set: { isActive: false, deletedAt: expect.any(Date) } },
        { new: true },
      );
      expect(result).toEqual({ deleted: true });
    });

    it("should throw NotFoundException when article not found", async () => {
      mockArticleModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.deleteArticle("non-existent", "org-1")).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.deleteArticle("non-existent", "org-1")).rejects.toThrow(
        "Article not found",
      );
    });
  });

  describe("createArticleMovement", () => {
    it("should create 'in' movement and call applyStockMovement", async () => {
      const articleDoc = mockArticleDoc({ stockQuantity: 5 });
      const movementDoc = mockStockMovementDoc({
        movementType: "in",
        quantity: 10,
        previousStock: 5,
        newStock: 15,
      });

      mockArticleModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(articleDoc),
      });
      mockStockMovementModel.create.mockResolvedValue(movementDoc);

      const body = {
        organizationId: "org-1",
        articleId: "article-123",
        movementType: "in" as const,
        quantity: 10,
        reason: "manual",
      };

      const result = await service.createArticleMovement(body);

      expect(mockArticleModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: "article-123",
          organizationId: "org-1",
          isActive: true,
          ...activeDocumentFilter,
        }),
        expect.objectContaining({ $inc: { stockQuantity: 10 } }),
        { new: false },
      );
      expect(mockStockMovementModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          movementType: "in",
          quantity: 10,
          previousStock: 5,
          newStock: 15,
        }),
      );
      expect(result.movementType).toBe("in");
      expect(result.quantity).toBe(10);
    });

    it("should create 'out' movement and call applyStockMovement", async () => {
      const articleDoc = mockArticleDoc({ stockQuantity: 20 });
      const movementDoc = mockStockMovementDoc({
        movementType: "out",
        quantity: 5,
        previousStock: 20,
        newStock: 15,
      });

      mockArticleModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(articleDoc),
      });
      mockStockMovementModel.create.mockResolvedValue(movementDoc);

      const body = {
        organizationId: "org-1",
        articleId: "article-123",
        movementType: "out" as const,
        quantity: 5,
      };

      const result = await service.createArticleMovement(body);

      expect(mockArticleModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          _id: "article-123",
          organizationId: "org-1",
          isActive: true,
          ...activeDocumentFilter,
          stockQuantity: { $gte: 5 },
        }),
        expect.objectContaining({ $inc: { stockQuantity: -5 } }),
        { new: false },
      );
      expect(result.movementType).toBe("out");
      expect(result.quantity).toBe(5);
    });

    it("should throw BadRequestException for unsupported movement type", async () => {
      const body = {
        organizationId: "org-1",
        articleId: "article-123",
        movementType: "invalid" as never,
        quantity: 10,
      };

      await expect(service.createArticleMovement(body)).rejects.toThrow(BadRequestException);
      await expect(service.createArticleMovement(body)).rejects.toThrow(
        "Unsupported movement type",
      );
    });
  });

  describe("listArticleMovements", () => {
    it("should build query with limit and return sorted list", async () => {
      const docs = [mockStockMovementDoc()];
      mockStockMovementModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(docs) }),
        }),
      });

      const result = await service.listArticleMovements("org-1", {
        articleId: "article-123",
        limit: 25,
      });

      expect(mockStockMovementModel.find).toHaveBeenCalledWith({
        organizationId: "org-1",
        articleId: "article-123",
      });
      expect(mockStockMovementModel.find().sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("movement-123");
    });
  });

  describe("createStockLocation", () => {
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
  });

  describe("createStockTransfer", () => {
    it("should throw BadRequestException when source equals destination", async () => {
      await expect(
        service.createStockTransfer({
          organizationId: "org-1",
          articleId: "article-1",
          sourceLocationId: "loc-1",
          destinationLocationId: "loc-1",
          quantity: 5,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when quantity is zero or negative", async () => {
      await expect(
        service.createStockTransfer({
          organizationId: "org-1",
          articleId: "article-1",
          sourceLocationId: "loc-1",
          destinationLocationId: "loc-2",
          quantity: 0,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("addInterventionArticleUsage", () => {
    it("should consume stock from an explicit location", async () => {
      mockStockMovementModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
      });
      mockStockLocationModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: { toString: () => "loc-van" },
          organizationId: "org-1",
          name: "Camion 1",
        }),
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ name: "Camion 1" }),
        }),
      });

      const previousDoc = mockArticleDoc({
        stockQuantity: 10,
        locationStocks: [{ locationId: "loc-van", quantity: 4 }],
      });
      mockArticleModel.findOneAndUpdate
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(previousDoc) })
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(previousDoc) });
      mockArticleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(previousDoc),
      });
      mockStockMovementModel.create.mockResolvedValue(
        mockStockMovementDoc({
          movementType: "out",
          quantity: 2,
          previousStock: 10,
          newStock: 8,
          reason: "intervention_usage",
          locationId: "loc-van",
          locationName: "Camion 1",
        }),
      );

      const result = await service.addInterventionArticleUsage("int-1", {
        organizationId: "org-1",
        articleId: "article-123",
        quantity: 2,
        locationId: "loc-van",
        caseId: "case-1",
      });

      expect(mockArticleModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          stockQuantity: { $gte: 2 },
        }),
        expect.objectContaining({ $inc: { stockQuantity: -2 } }),
        expect.anything(),
      );
      expect(result.movementType).toBe("out");
      expect(result.locationId).toBe("loc-van");
      expect(mockStockMovementModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: "intervention_usage",
          locationId: "loc-van",
          interventionId: "int-1",
        }),
      );
    });

    it("should reject when location stock is insufficient", async () => {
      mockStockMovementModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
      });
      mockStockLocationModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: { toString: () => "loc-van" },
          organizationId: "org-1",
          name: "Camion 1",
        }),
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ name: "Camion 1" }),
        }),
      });

      const previousDoc = mockArticleDoc({
        stockQuantity: 10,
        locationStocks: [{ locationId: "loc-van", quantity: 1 }],
      });
      mockArticleModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(previousDoc),
      });
      mockArticleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(previousDoc),
      });

      await expect(
        service.addInterventionArticleUsage("int-1", {
          organizationId: "org-1",
          articleId: "article-123",
          quantity: 3,
          locationId: "loc-van",
        }),
      ).rejects.toThrow(ConflictException);
    });

    it("should fall back to default location when locationId is omitted", async () => {
      mockStockMovementModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
      });
      mockStockLocationModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: { toString: () => "loc-default" },
          organizationId: "org-1",
          name: "Entrepôt",
          isDefault: true,
        }),
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ name: "Entrepôt" }),
        }),
      });

      const previousDoc = mockArticleDoc({ stockQuantity: 5, locationStocks: [] });
      mockArticleModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(previousDoc),
      });
      mockArticleModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(previousDoc),
      });
      mockStockMovementModel.create.mockResolvedValue(
        mockStockMovementDoc({
          movementType: "out",
          quantity: 1,
          previousStock: 5,
          newStock: 4,
          reason: "intervention_usage",
          locationId: "loc-default",
        }),
      );

      const result = await service.addInterventionArticleUsage("int-1", {
        organizationId: "org-1",
        articleId: "article-123",
        quantity: 1,
      });

      expect(result.locationId).toBe("loc-default");
    });
  });
});
