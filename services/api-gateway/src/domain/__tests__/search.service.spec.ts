import { Test, TestingModule } from "@nestjs/testing";
import type { AuthUser } from "@planwise/shared";
import { SearchGatewayService } from "../search.service";
import { OrganizationScopedHttpClient } from "../../infrastructure/organization-scoped-http.client";

describe("SearchGatewayService", () => {
  let service: SearchGatewayService;
  const scopedRequest = jest.fn();

  const user: AuthUser = {
    id: "user-1",
    email: "admin@test.fr",
    organizationId: "org-1",
    role: "admin",
    status: "active",
    permissions: [],
    name: "Admin",
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchGatewayService,
        {
          provide: OrganizationScopedHttpClient,
          useValue: { request: scopedRequest },
        },
      ],
    }).compile();

    service = module.get(SearchGatewayService);

    scopedRequest.mockImplementation(
      async (options: { path?: string; query?: Record<string, unknown> }) => {
        if (options.path === "/cases") return { cases: [], total: 0 };
        if (options.path === "/interventions") return { interventions: [], total: 0 };
        if (options.path === "/vehicles") return [];
        if (options.path === "/technicians") return [];
        if (options.path === "/articles") {
          return {
            articles: [
              {
                id: "art-42",
                organizationId: "org-1",
                name: "Cable RJ45",
                reference: "CAB-001",
                description: "Câble réseau",
                unit: "m",
                stockQuantity: 12,
              },
            ],
            total: 1,
          };
        }
        if (options.path === "/users") return [];
        return [];
      },
    );
  });

  it("should link article search results to the article detail page", async () => {
    const result = await service.search(user, "cable");

    expect(result.results).toEqual([
      expect.objectContaining({
        id: "art-42",
        type: "article",
        url: "/settings/stock/articles/art-42",
      }),
    ]);
  });

  it("should pass search and limit to paginated list endpoints", async () => {
    await service.search(user, "cable");

    expect(scopedRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/cases",
        query: expect.objectContaining({ search: "cable", limit: 50, offset: 0 }),
      }),
    );
    expect(scopedRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/interventions",
        query: expect.objectContaining({ search: "cable", limit: 50, offset: 0 }),
      }),
    );
    expect(scopedRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/articles",
        query: expect.objectContaining({ search: "cable", limit: 50, offset: 0 }),
      }),
    );
  });

  it("should return empty results for blank query", async () => {
    const result = await service.search(user, "   ");

    expect(result).toEqual({ query: "   ", results: [], counts: {} });
    expect(scopedRequest).not.toHaveBeenCalled();
  });
});
