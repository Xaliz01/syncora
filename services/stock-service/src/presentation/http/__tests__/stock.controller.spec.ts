import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { StockController } from "../stock.controller";
import { AbstractStockService } from "../../../domain/ports/stock.service.port";

describe("StockController", () => {
  let controller: StockController;
  let mockStockService: jest.Mocked<AbstractStockService>;

  beforeEach(async () => {
    mockStockService = {
      createArticle: jest.fn(),
      listArticles: jest.fn(),
      getArticle: jest.fn(),
      updateArticle: jest.fn(),
      deleteArticle: jest.fn(),
      createArticleMovement: jest.fn(),
      addInterventionArticleUsage: jest.fn(),
      listArticleMovements: jest.fn(),
      getInterventionUsage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StockController],
      providers: [
        {
          provide: AbstractStockService,
          useValue: mockStockService,
        },
      ],
    }).compile();

    controller = module.get<StockController>(StockController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("createArticle", () => {
    it("should call stockService.createArticle with body", async () => {
      const body = {
        organizationId: "org-1",
        name: "Article A",
        reference: "REF-001",
      };
      mockStockService.createArticle.mockResolvedValue({
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

      expect(mockStockService.createArticle).toHaveBeenCalledWith(body);
      expect(result.id).toBe("article-1");
      expect(result.name).toBe("Article A");
    });
  });

  describe("listArticles", () => {
    it("should call stockService.listArticles with organizationId and filters", async () => {
      mockStockService.listArticles.mockResolvedValue([
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
      ] as never);

      const result = await controller.listArticles("org-1", "search", "false", "true");

      expect(mockStockService.listArticles).toHaveBeenCalledWith("org-1", {
        search: "search",
        lowStockOnly: false,
        activeOnly: true,
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("article-1");
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(
        controller.listArticles(undefined as never, undefined, undefined, undefined),
      ).rejects.toThrow(BadRequestException);
      await expect(
        controller.listArticles(undefined as never, undefined, undefined, undefined),
      ).rejects.toThrow("organizationId query param is required");
      expect(mockStockService.listArticles).not.toHaveBeenCalled();
    });
  });

  describe("getArticle", () => {
    it("should call stockService.getArticle with id and organizationId", async () => {
      mockStockService.getArticle.mockResolvedValue({
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

      expect(mockStockService.getArticle).toHaveBeenCalledWith("article-1", "org-1");
      expect(result.id).toBe("article-1");
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(controller.getArticle("article-1", undefined as never)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockStockService.getArticle).not.toHaveBeenCalled();
    });
  });

  describe("updateArticle", () => {
    it("should call stockService.updateArticle with id and body", async () => {
      const body = {
        organizationId: "org-1",
        name: "Updated Article",
        reorderPoint: 10,
        targetStock: 25,
      };
      mockStockService.updateArticle.mockResolvedValue({
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

      expect(mockStockService.updateArticle).toHaveBeenCalledWith("article-1", body);
      expect(result.name).toBe("Updated Article");
    });
  });

  describe("deleteArticle", () => {
    it("should call stockService.deleteArticle with id and organizationId", async () => {
      mockStockService.deleteArticle.mockResolvedValue({ deleted: true } as never);

      const result = await controller.deleteArticle("article-1", "org-1");

      expect(mockStockService.deleteArticle).toHaveBeenCalledWith("article-1", "org-1");
      expect(result).toEqual({ deleted: true });
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(controller.deleteArticle("article-1", undefined as never)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockStockService.deleteArticle).not.toHaveBeenCalled();
    });
  });

  describe("createArticleMovement", () => {
    it("should call stockService.createArticleMovement with body", async () => {
      const body = {
        organizationId: "org-1",
        articleId: "article-1",
        movementType: "in" as const,
        quantity: 10,
      };
      mockStockService.createArticleMovement.mockResolvedValue({
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

      expect(mockStockService.createArticleMovement).toHaveBeenCalledWith(body);
      expect(result.movementType).toBe("in");
      expect(result.quantity).toBe(10);
    });
  });

  describe("listArticleMovements", () => {
    it("should call stockService.listArticleMovements with organizationId and filters", async () => {
      mockStockService.listArticleMovements.mockResolvedValue([
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
        "50",
      );

      expect(mockStockService.listArticleMovements).toHaveBeenCalledWith("org-1", {
        articleId: "article-1",
        interventionId: "int-1",
        caseId: "case-1",
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
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockStockService.listArticleMovements).not.toHaveBeenCalled();
    });
  });

  describe("addInterventionArticleUsage", () => {
    it("should call stockService.addInterventionArticleUsage with interventionId and body", async () => {
      const body = {
        organizationId: "org-1",
        articleId: "article-1",
        quantity: 5,
      };
      mockStockService.addInterventionArticleUsage.mockResolvedValue({
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

      expect(mockStockService.addInterventionArticleUsage).toHaveBeenCalledWith(
        "intervention-1",
        body,
      );
      expect(result.movementType).toBe("out");
      expect(result.quantity).toBe(5);
    });
  });

  describe("getInterventionUsage", () => {
    it("should call stockService.getInterventionUsage with organizationId and interventionId", async () => {
      mockStockService.getInterventionUsage.mockResolvedValue([
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

      expect(mockStockService.getInterventionUsage).toHaveBeenCalledWith("org-1", "intervention-1");
      expect(result).toHaveLength(1);
      expect(result[0].articleId).toBe("article-1");
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(
        controller.getInterventionUsage("intervention-1", undefined as never),
      ).rejects.toThrow(BadRequestException);
      expect(mockStockService.getInterventionUsage).not.toHaveBeenCalled();
    });
  });
});
