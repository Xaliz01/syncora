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
        if (options.path === "/customers") {
          return {
            customers: [
              {
                id: "cust-1",
                organizationId: "org-1",
                kind: "company",
                displayName: "Acme Plomberie",
                companyName: "Acme Plomberie SARL",
                email: "contact@acme.fr",
                legalIdentifier: "12345678900012",
                address: {
                  line1: "12 rue de Vaugirard",
                  postalCode: "75015",
                  city: "Paris",
                  country: "FR",
                },
              },
              {
                id: "cust-2",
                organizationId: "org-1",
                kind: "individual",
                displayName: "Jean Moulin",
                firstName: "Jean",
                lastName: "Moulin",
                email: "jean.moulin@example.fr",
                sites: [
                  {
                    id: "site-1",
                    label: "Chantier Lyon",
                    address: {
                      line1: "5 place Bellecour",
                      postalCode: "69002",
                      city: "Lyon",
                      country: "FR",
                    },
                  },
                ],
              },
            ],
            total: 2,
          };
        }
        if (options.path === "/order-givers") {
          return {
            orderGivers: [
              {
                id: "og-1",
                organizationId: "org-1",
                kind: "company",
                displayName: "Syndic Alpha",
                companyName: "Syndic Alpha",
                email: "contact@syndic-alpha.fr",
              },
            ],
            total: 1,
          };
        }
        if (options.path === "/vehicles") return [];
        if (options.path === "/technicians") return [];
        if (options.path === "/teams") return [];
        if (options.path === "/agences") return [];
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
        if (options.path === "/prestations") {
          return {
            prestations: [
              {
                id: "prest-1",
                organizationId: "org-1",
                name: "Main d'œuvre plomberie",
                reference: "MO-PLB",
                description: "Intervention sur site",
                unit: "heure",
                defaultPrice: 55,
                defaultTvaRate: 20,
                isActive: true,
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

  it("should include prestations in global search", async () => {
    const result = await service.search(user, "plomberie");

    expect(result.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "prest-1",
          type: "prestation",
          title: "Main d'œuvre plomberie (MO-PLB)",
          url: "/settings/prestations?q=MO-PLB",
        }),
      ]),
    );
    expect(scopedRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/prestations",
        query: expect.objectContaining({ search: "plomberie", limit: 50, offset: 0 }),
      }),
    );
  });

  it("should return customers matching company name (raison sociale)", async () => {
    const result = await service.search(user, "acme");

    expect(result.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "cust-1",
          type: "customer",
          title: "Acme Plomberie",
          url: "/customers/cust-1",
        }),
      ]),
    );
    expect(scopedRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/customers",
        query: expect.objectContaining({ search: "acme", limit: 50, offset: 0 }),
      }),
    );
  });

  it("should match customers when query tokens span first and last name", async () => {
    const result = await service.search(user, "Jean Moulin");

    expect(result.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "cust-2",
          type: "customer",
          title: "Jean Moulin",
          url: "/customers/cust-2",
        }),
      ]),
    );
  });

  it("should match customers by main address", async () => {
    const result = await service.search(user, "Vaugirard");

    expect(result.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "cust-1",
          type: "customer",
          title: "Acme Plomberie",
          subtitle: expect.stringContaining("12 rue de Vaugirard"),
        }),
      ]),
    );
  });

  it("should match customers by site address", async () => {
    const result = await service.search(user, "Bellecour Lyon");

    expect(result.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "cust-2",
          type: "customer",
          title: "Jean Moulin",
        }),
      ]),
    );
  });

  it("should include order givers in global search", async () => {
    const result = await service.search(user, "syndic");

    expect(result.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "og-1",
          type: "order_giver",
          title: "Syndic Alpha",
          url: "/order-givers/og-1",
        }),
      ]),
    );
    expect(scopedRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/order-givers",
        query: expect.objectContaining({ search: "syndic", limit: 50, offset: 0 }),
      }),
    );
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
        path: "/customers",
        query: expect.objectContaining({ search: "cable", limit: 50, offset: 0 }),
      }),
    );
    expect(scopedRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/articles",
        query: expect.objectContaining({ search: "cable", limit: 50, offset: 0 }),
      }),
    );
    expect(scopedRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/prestations",
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
