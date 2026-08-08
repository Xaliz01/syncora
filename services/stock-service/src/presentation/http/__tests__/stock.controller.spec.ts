import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { StockController } from "../stock.controller";
import { AbstractArticleStockService } from "../../../domain/ports/article-stock.service.port";
import { AbstractPrestationService } from "../../../domain/ports/prestation.service.port";
import { AbstractStockLocationService } from "../../../domain/ports/stock-location.service.port";

describe("StockController", () => {
  let controller: StockController;
  let mockArticleStockService: jest.Mocked<AbstractArticleStockService>;
  let mockPrestationService: jest.Mocked<AbstractPrestationService>;
  let mockStockLocationService: jest.Mocked<AbstractStockLocationService>;

  beforeEach(async () => {
    mockArticleStockService = {
      createArticle: jest.fn(),
      listArticles: jest.fn(),
      getArticle: jest.fn(),
      updateArticle: jest.fn(),
      deleteArticle: jest.fn(),
      createArticleMovement: jest.fn(),
      addInterventionArticleUsage: jest.fn(),
      listArticleMovements: jest.fn(),
      getInterventionUsage: jest.fn(),
      createStockTransfer: jest.fn(),
      purgeTestData: jest.fn(),
    };

    mockPrestationService = {
      createPrestation: jest.fn(),
      listPrestations: jest.fn(),
      getPrestation: jest.fn(),
      updatePrestation: jest.fn(),
      deletePrestation: jest.fn(),
      purgeTestData: jest.fn(),
    };

    mockStockLocationService = {
      createStockLocation: jest.fn(),
      listStockLocations: jest.fn(),
      getStockLocation: jest.fn(),
      updateStockLocation: jest.fn(),
      deleteStockLocation: jest.fn(),
      resolveLocationId: jest.fn(),
      getDefaultLocationId: jest.fn(),
      getLocationName: jest.fn(),
      purgeTestData: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StockController],
      providers: [
        {
          provide: AbstractArticleStockService,
          useValue: mockArticleStockService,
        },
        {
          provide: AbstractPrestationService,
          useValue: mockPrestationService,
        },
        {
          provide: AbstractStockLocationService,
          useValue: mockStockLocationService,
        },
      ],
    }).compile();

    controller = module.get<StockController>(StockController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("createArticle", () => {
    it("should call articleStockService.createArticle with body", async () => {
      const body = {
        organizationId: "org-1",
        name: "Article A",
        reference: "REF-001",
      };
      mockArticleStockService.createArticle.mockResolvedValue({
        id: "article-1",
        organizationId: "org-1",
        name: "Article A",
        reference: "REF-001",
        unit: "unité",
        stockQuantity: 0,
        reorderPoint: 0,
        targetStock: 0,
        isActive: true,
        lowStock: false,
        stockStatus: "ok",
        suggestedReorderQuantity: 0,
      } as never);

      const result = await controller.createArticle(body);

      expect(mockArticleStockService.createArticle).toHaveBeenCalledWith(body);
      expect(result.id).toBe("article-1");
      expect(result.name).toBe("Article A");
    });
  });

  describe("listArticles", () => {
    it("should call articleStockService.listArticles with organizationId and filters", async () => {
      mockArticleStockService.listArticles.mockResolvedValue({
        articles: [
          {
            id: "article-1",
            organizationId: "org-1",
            name: "Article A",
            reference: "REF-001",
            unit: "unité",
            stockQuantity: 10,
            reorderPoint: 5,
            targetStock: 20,
            isActive: true,
            lowStock: false,
            stockStatus: "ok",
            suggestedReorderQuantity: 10,
          },
        ],
        total: 1,
      } as never);

      const result = await controller.listArticles("org-1", "search", "false", "true", undefined);

      expect(mockArticleStockService.listArticles).toHaveBeenCalledWith("org-1", {
        search: "search",
        lowStockOnly: false,
        activeOnly: true,
        locationId: undefined,
        limit: 50,
        offset: 0,
      });
      expect(result.articles).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.articles[0].id).toBe("article-1");
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(
        controller.listArticles(undefined as never, undefined, undefined, undefined, undefined),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.listArticles(undefined as never, undefined, undefined, undefined, undefined),
      ).rejects.toThrow("organizationId query param is required");
      expect(mockArticleStockService.listArticles).not.toHaveBeenCalled();
    });
  });

  describe("getArticle", () => {
    it("should call articleStockService.getArticle with id and organizationId", async () => {
      mockArticleStockService.getArticle.mockResolvedValue({
        id: "article-1",
        organizationId: "org-1",
        name: "Article A",
        reference: "REF-001",
        unit: "unité",
        stockQuantity: 10,
        reorderPoint: 5,
        targetStock: 20,
        isActive: true,
        lowStock: false,
        stockStatus: "ok",
        suggestedReorderQuantity: 10,
      } as never);

      const result = await controller.getArticle("article-1", "org-1");

      expect(mockArticleStockService.getArticle).toHaveBeenCalledWith("article-1", "org-1");
      expect(result.id).toBe("article-1");
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(controller.getArticle("article-1", undefined as never)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockArticleStockService.getArticle).not.toHaveBeenCalled();
    });
  });

  describe("updateArticle", () => {
    it("should call articleStockService.updateArticle with id and body", async () => {
      const body = {
        organizationId: "org-1",
        name: "Updated Article",
        reorderPoint: 10,
        targetStock: 25,
      };
      mockArticleStockService.updateArticle.mockResolvedValue({
        id: "article-1",
        organizationId: "org-1",
        name: "Updated Article",
        reference: "REF-001",
        unit: "unité",
        stockQuantity: 10,
        reorderPoint: 10,
        targetStock: 25,
        isActive: true,
        lowStock: false,
        stockStatus: "ok",
        suggestedReorderQuantity: 15,
      } as never);

      const result = await controller.updateArticle("article-1", body);

      expect(mockArticleStockService.updateArticle).toHaveBeenCalledWith("article-1", body);
      expect(result.name).toBe("Updated Article");
    });
  });

  describe("deleteArticle", () => {
    it("should call articleStockService.deleteArticle with id and organizationId", async () => {
      mockArticleStockService.deleteArticle.mockResolvedValue({ deleted: true } as never);

      const result = await controller.deleteArticle("article-1", "org-1");

      expect(mockArticleStockService.deleteArticle).toHaveBeenCalledWith("article-1", "org-1");
      expect(result).toEqual({ deleted: true });
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(controller.deleteArticle("article-1", undefined as never)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockArticleStockService.deleteArticle).not.toHaveBeenCalled();
    });
  });

  describe("createArticleMovement", () => {
    it("should call articleStockService.createArticleMovement with body", async () => {
      const body = {
        organizationId: "org-1",
        articleId: "article-1",
        movementType: "in" as const,
        quantity: 10,
      };
      mockArticleStockService.createArticleMovement.mockResolvedValue({
        id: "movement-1",
        organizationId: "org-1",
        articleId: "article-1",
        articleName: "Article A",
        movementType: "in",
        quantity: 10,
        previousStock: 0,
        newStock: 10,
      } as never);

      const result = await controller.createArticleMovement(body);

      expect(mockArticleStockService.createArticleMovement).toHaveBeenCalledWith(body);
      expect(result.movementType).toBe("in");
      expect(result.quantity).toBe(10);
    });
  });

  describe("listArticleMovements", () => {
    it("should call articleStockService.listArticleMovements with organizationId and filters", async () => {
      mockArticleStockService.listArticleMovements.mockResolvedValue([
        {
          id: "movement-1",
          organizationId: "org-1",
          articleId: "article-1",
          articleName: "Article A",
          movementType: "in",
          quantity: 10,
          previousStock: 0,
          newStock: 10,
        },
      ] as never);

      const result = await controller.listArticleMovements(
        "org-1",
        "article-1",
        "int-1",
        "case-1",
        undefined,
        "50",
      );

      expect(mockArticleStockService.listArticleMovements).toHaveBeenCalledWith("org-1", {
        articleId: "article-1",
        interventionId: "int-1",
        caseId: "case-1",
        locationId: undefined,
        limit: 50,
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("movement-1");
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(
        controller.listArticleMovements(
          undefined as never,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockArticleStockService.listArticleMovements).not.toHaveBeenCalled();
    });
  });

  describe("addInterventionArticleUsage", () => {
    it("should call articleStockService.addInterventionArticleUsage with interventionId and body", async () => {
      const body = {
        organizationId: "org-1",
        articleId: "article-1",
        quantity: 5,
      };
      mockArticleStockService.addInterventionArticleUsage.mockResolvedValue({
        id: "movement-1",
        organizationId: "org-1",
        articleId: "article-1",
        articleName: "Article A",
        movementType: "out",
        quantity: 5,
        previousStock: 10,
        newStock: 5,
      } as never);

      const result = await controller.addInterventionArticleUsage("intervention-1", body);

      expect(mockArticleStockService.addInterventionArticleUsage).toHaveBeenCalledWith(
        "intervention-1",
        body,
      );
      expect(result.movementType).toBe("out");
      expect(result.quantity).toBe(5);
    });
  });

  describe("getInterventionUsage", () => {
    it("should call articleStockService.getInterventionUsage with organizationId and interventionId", async () => {
      mockArticleStockService.getInterventionUsage.mockResolvedValue([
        {
          articleId: "article-1",
          articleName: "Article A",
          unit: "unité",
          consumedQuantity: 5,
          returnedQuantity: 0,
          netQuantity: 5,
        },
      ] as never);

      const result = await controller.getInterventionUsage("intervention-1", "org-1");

      expect(mockArticleStockService.getInterventionUsage).toHaveBeenCalledWith(
        "org-1",
        "intervention-1",
      );
      expect(result).toHaveLength(1);
      expect(result[0].articleId).toBe("article-1");
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(
        controller.getInterventionUsage("intervention-1", undefined as never),
      ).rejects.toThrow(BadRequestException);
      expect(mockArticleStockService.getInterventionUsage).not.toHaveBeenCalled();
    });
  });
});
