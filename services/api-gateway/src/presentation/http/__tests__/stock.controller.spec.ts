import { Test, TestingModule } from "@nestjs/testing";
import { StockController } from "../stock.controller";
import { AbstractStockGatewayService } from "../../../domain/ports/stock.service.port";
import { JwtAuthGuard } from "../../../infrastructure/jwt-auth.guard";
import { RequirePermissionGuard } from "../../../infrastructure/require-permission.guard";
import { SubscriptionAccessGuard } from "../../../infrastructure/subscription-access.guard";
import type { AuthUser } from "@syncora/shared";

describe("StockController", () => {
  let controller: StockController;
  let mockStockService: jest.Mocked<AbstractStockGatewayService>;

  const mockUser: AuthUser = {
    id: "user-123",
    email: "admin@example.com",
    organizationId: "org-123",
    role: "admin",
    status: "active",
    permissions: [],
    name: "Admin User"
  };

  beforeEach(async () => {
    mockStockService = {
      createArticle: jest.fn(),
      listArticles: jest.fn(),
      getArticle: jest.fn(),
      updateArticle: jest.fn(),
      deleteArticle: jest.fn(),
      createArticleMovement: jest.fn(),
      listArticleMovements: jest.fn(),
      addInterventionArticleUsage: jest.fn(),
      getInterventionUsage: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StockController],
      providers: [
        {
          provide: AbstractStockGatewayService,
          useValue: mockStockService
        }
      ]
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(SubscriptionAccessGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RequirePermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<StockController>(StockController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("createArticle", () => {
    it("should call stockService.createArticle with user and body", async () => {
      const body = {
        name: "Article A",
        reference: "REF-001",
        description: "Description",
        unit: "unité"
      };
      mockStockService.createArticle.mockResolvedValue({
        id: "article-1",
        organizationId: "org-123",
        name: "Article A",
        reference: "REF-001",
        unit: "unité",
        stockQuantity: 0,
        reorderPoint: 0,
        targetStock: 0,
        isActive: true,
        lowStock: false,
        stockStatus: "ok",
        suggestedReorderQuantity: 0
      } as never);

      const result = await controller.createArticle(mockUser, body);

      expect(mockStockService.createArticle).toHaveBeenCalledWith(mockUser, body);
      expect(result.id).toBe("article-1");
      expect(result.name).toBe("Article A");
    });
  });

  describe("listArticles", () => {
    it("should call stockService.listArticles with user and filters", async () => {
      mockStockService.listArticles.mockResolvedValue([
        {
          id: "article-1",
          organizationId: "org-123",
          name: "Article A",
          reference: "REF-001",
          unit: "unité",
          stockQuantity: 10,
          reorderPoint: 5,
          targetStock: 20,
          isActive: true,
          lowStock: false,
          stockStatus: "ok",
          suggestedReorderQuantity: 10
        }
      ] as never);

      const result = await controller.listArticles(mockUser, "search", "false", "true");

      expect(mockStockService.listArticles).toHaveBeenCalledWith(mockUser, {
        search: "search",
        lowStockOnly: false,
        activeOnly: true
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("article-1");
    });
  });

  describe("getArticle", () => {
    it("should call stockService.getArticle with user and articleId", async () => {
      mockStockService.getArticle.mockResolvedValue({
        id: "article-1",
        organizationId: "org-123",
        name: "Article A",
        reference: "REF-001",
        unit: "unité",
        stockQuantity: 10,
        reorderPoint: 5,
        targetStock: 20,
        isActive: true,
        lowStock: false,
        stockStatus: "ok",
        suggestedReorderQuantity: 10
      } as never);

      const result = await controller.getArticle(mockUser, "article-1");

      expect(mockStockService.getArticle).toHaveBeenCalledWith(mockUser, "article-1");
      expect(result.id).toBe("article-1");
    });
  });

  describe("updateArticle", () => {
    it("should call stockService.updateArticle with user, articleId and body", async () => {
      const body = { name: "Updated Article", reorderPoint: 10, targetStock: 25 };
      mockStockService.updateArticle.mockResolvedValue({
        id: "article-1",
        organizationId: "org-123",
        name: "Updated Article",
        reference: "REF-001",
        unit: "unité",
        stockQuantity: 10,
        reorderPoint: 10,
        targetStock: 25,
        isActive: true,
        lowStock: false,
        stockStatus: "ok",
        suggestedReorderQuantity: 15
      } as never);

      const result = await controller.updateArticle(mockUser, "article-1", body);

      expect(mockStockService.updateArticle).toHaveBeenCalledWith(mockUser, "article-1", body);
      expect(result.name).toBe("Updated Article");
    });
  });

  describe("deleteArticle", () => {
    it("should call stockService.deleteArticle with user and articleId", async () => {
      mockStockService.deleteArticle.mockResolvedValue({ deleted: true } as never);

      const result = await controller.deleteArticle(mockUser, "article-1");

      expect(mockStockService.deleteArticle).toHaveBeenCalledWith(mockUser, "article-1");
      expect(result).toEqual({ deleted: true });
    });
  });

  describe("createArticleMovement", () => {
    it("should call stockService.createArticleMovement with user and body", async () => {
      const body = {
        articleId: "article-1",
        movementType: "in" as const,
        quantity: 10
      };
      mockStockService.createArticleMovement.mockResolvedValue({
        id: "movement-1",
        organizationId: "org-123",
        articleId: "article-1",
        articleName: "Article A",
        movementType: "in",
        quantity: 10,
        previousStock: 0,
        newStock: 10
      } as never);

      const result = await controller.createArticleMovement(mockUser, body);

      expect(mockStockService.createArticleMovement).toHaveBeenCalledWith(mockUser, body);
      expect(result.movementType).toBe("in");
      expect(result.quantity).toBe(10);
    });
  });

  describe("listArticleMovements", () => {
    it("should call stockService.listArticleMovements with user and filters", async () => {
      mockStockService.listArticleMovements.mockResolvedValue([
        {
          id: "movement-1",
          organizationId: "org-123",
          articleId: "article-1",
          articleName: "Article A",
          movementType: "in",
          quantity: 10,
          previousStock: 0,
          newStock: 10
        }
      ] as never);

      const result = await controller.listArticleMovements(
        mockUser,
        "article-1",
        "int-1",
        "case-1",
        "50"
      );

      expect(mockStockService.listArticleMovements).toHaveBeenCalledWith(mockUser, {
        articleId: "article-1",
        interventionId: "int-1",
        caseId: "case-1",
        limit: 50
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("movement-1");
    });
  });

  describe("addInterventionArticleUsage", () => {
    it("should call stockService.addInterventionArticleUsage with user, interventionId and body", async () => {
      const body = {
        articleId: "article-1",
        quantity: 5,
        caseId: "case-1"
      };
      mockStockService.addInterventionArticleUsage.mockResolvedValue({
        id: "movement-1",
        organizationId: "org-123",
        articleId: "article-1",
        articleName: "Article A",
        movementType: "out",
        quantity: 5,
        previousStock: 10,
        newStock: 5
      } as never);

      const result = await controller.addInterventionArticleUsage(
        mockUser,
        "intervention-1",
        body
      );

      expect(mockStockService.addInterventionArticleUsage).toHaveBeenCalledWith(
        mockUser,
        "intervention-1",
        body
      );
      expect(result.movementType).toBe("out");
      expect(result.quantity).toBe(5);
    });
  });

  describe("getInterventionUsage", () => {
    it("should call stockService.getInterventionUsage with user and interventionId", async () => {
      mockStockService.getInterventionUsage.mockResolvedValue([
        {
          articleId: "article-1",
          articleName: "Article A",
          unit: "unité",
          consumedQuantity: 5,
          returnedQuantity: 0,
          netQuantity: 5
        }
      ] as never);

      const result = await controller.getInterventionUsage(mockUser, "intervention-1");

      expect(mockStockService.getInterventionUsage).toHaveBeenCalledWith(
        mockUser,
        "intervention-1"
      );
      expect(result).toHaveLength(1);
      expect(result[0].articleId).toBe("article-1");
    });
  });
});
