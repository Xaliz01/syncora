import { Test, TestingModule } from "@nestjs/testing";
import { SearchController } from "../search.controller";
import { AbstractSearchService } from "../../../domain/ports/search.service.port";
import { JwtAuthGuard } from "../../../infrastructure/jwt-auth.guard";
import { RequirePermissionGuard } from "../../../infrastructure/require-permission.guard";
import { SubscriptionAccessGuard } from "../../../infrastructure/subscription-access.guard";
import type { AuthUser } from "@syncora/shared";

describe("SearchController", () => {
  let controller: SearchController;
  let mockSearchService: jest.Mocked<AbstractSearchService>;

  const mockUser: AuthUser = {
    id: "user-123",
    email: "admin@example.com",
    organizationId: "org-123",
    role: "admin",
    status: "active",
    permissions: [],
    name: "Admin User",
  };

  beforeEach(async () => {
    mockSearchService = {
      search: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        {
          provide: AbstractSearchService,
          useValue: mockSearchService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(SubscriptionAccessGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RequirePermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SearchController>(SearchController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("search", () => {
    it("should call searchService.search with user and query", async () => {
      const expected = { query: "test", results: [], counts: {} };
      mockSearchService.search.mockResolvedValue(expected as never);

      const result = await controller.search(mockUser, "test");

      expect(mockSearchService.search).toHaveBeenCalledWith(mockUser, "test");
      expect(result).toEqual(expected);
    });

    it("should call searchService.search with empty string when query is undefined", async () => {
      const expected = { query: "", results: [], counts: {} };
      mockSearchService.search.mockResolvedValue(expected as never);

      const result = await controller.search(mockUser, undefined);

      expect(mockSearchService.search).toHaveBeenCalledWith(mockUser, "");
      expect(result).toEqual(expected);
    });
  });
});
