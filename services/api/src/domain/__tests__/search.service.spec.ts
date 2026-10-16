import { Test, TestingModule } from "@nestjs/testing";
import type { AuthUser } from "@planwise/shared";
import { SearchGatewayService } from "../search.service";
import { AbstractCasesService } from "../cases/ports/cases.service.port";
import { AbstractInterventionsService } from "../cases/ports/interventions.service.port";
import { AbstractCustomersService } from "../customers/ports/customers.service.port";
import { AbstractOrderGiversService } from "../customers/ports/order-givers.service.port";
import { AbstractFleetService } from "../fleet/ports/fleet.service.port";
import { AbstractTechniciansService } from "../technicians/ports/technicians.service.port";
import { AbstractTeamsService } from "../technicians/ports/teams.service.port";
import { AbstractAgencesService } from "../technicians/ports/agences.service.port";
import { AbstractArticleStockService } from "../stock/ports/article-stock.service.port";
import { AbstractPrestationService } from "../stock/ports/prestation.service.port";
import { AbstractInvoicesService } from "../billing/ports/invoices.service.port";
import { AbstractUsersService } from "../users/ports/users.service.port";

describe("SearchGatewayService", () => {
  let service: SearchGatewayService;
  let casesService: { listCases: jest.Mock };
  let interventionsService: { listInterventions: jest.Mock };
  let customersService: { listCustomers: jest.Mock };
  let orderGiversService: { listOrderGivers: jest.Mock };
  let articlesService: { listArticles: jest.Mock };
  let prestationsService: { listPrestations: jest.Mock };
  let invoicesService: { listInvoices: jest.Mock };

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

    casesService = { listCases: jest.fn().mockResolvedValue({ cases: [], total: 0 }) };
    interventionsService = {
      listInterventions: jest.fn().mockResolvedValue({ interventions: [], total: 0 }),
    };
    customersService = { listCustomers: jest.fn() };
    orderGiversService = { listOrderGivers: jest.fn() };
    articlesService = { listArticles: jest.fn() };
    prestationsService = { listPrestations: jest.fn() };
    invoicesService = { listInvoices: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchGatewayService,
        { provide: AbstractCasesService, useValue: casesService },
        { provide: AbstractInterventionsService, useValue: interventionsService },
        { provide: AbstractCustomersService, useValue: customersService },
        { provide: AbstractOrderGiversService, useValue: orderGiversService },
        {
          provide: AbstractFleetService,
          useValue: { listVehicles: jest.fn().mockResolvedValue([]) },
        },
        {
          provide: AbstractTechniciansService,
          useValue: { listTechnicians: jest.fn().mockResolvedValue([]) },
        },
        { provide: AbstractTeamsService, useValue: { listTeams: jest.fn().mockResolvedValue([]) } },
        {
          provide: AbstractAgencesService,
          useValue: { listAgences: jest.fn().mockResolvedValue([]) },
        },
        { provide: AbstractArticleStockService, useValue: articlesService },
        { provide: AbstractPrestationService, useValue: prestationsService },
        { provide: AbstractInvoicesService, useValue: invoicesService },
        {
          provide: AbstractUsersService,
          useValue: { listByOrganization: jest.fn().mockResolvedValue([]) },
        },
      ],
    }).compile();

    service = module.get(SearchGatewayService);

    customersService.listCustomers.mockResolvedValue({
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
    });
    orderGiversService.listOrderGivers.mockResolvedValue({
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
    });
    articlesService.listArticles.mockResolvedValue({
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
    });
    prestationsService.listPrestations.mockResolvedValue({
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
    });
    invoicesService.listInvoices.mockResolvedValue({
      invoices: [
        {
          id: "inv-1",
          organizationId: "org-1",
          caseId: "case-99",
          kind: "full",
          status: "finalized",
          number: "F-2026-00001",
          invoiceDate: "2026-09-01T00:00:00.000Z",
          amountHt: "150.00",
          amountTtc: "180.00",
          lines: [
            {
              label: "Main d'œuvre toiture",
              quantity: 1,
              unitPriceHt: "150.00",
              tvaRate: 20,
            },
          ],
          customer: {
            partyId: "cust-inv",
            partyType: "customer",
            displayName: "Toiture Dupont",
            email: "dupont@example.fr",
          },
          caseTitle: "Réfection toiture",
        },
      ],
      total: 1,
    });
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
    expect(prestationsService.listPrestations).toHaveBeenCalledWith("org-1", {
      search: "plomberie",
      limit: 50,
      offset: 0,
    });
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
    expect(customersService.listCustomers).toHaveBeenCalledWith("org-1", {
      search: "acme",
      limit: 50,
      offset: 0,
    });
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
    expect(orderGiversService.listOrderGivers).toHaveBeenCalledWith("org-1", {
      search: "syndic",
      limit: 50,
      offset: 0,
    });
  });

  it("should pass search and limit to paginated list endpoints", async () => {
    await service.search(user, "cable");

    const page = { search: "cable", limit: 50, offset: 0 };
    expect(casesService.listCases).toHaveBeenCalledWith("org-1", page);
    expect(interventionsService.listInterventions).toHaveBeenCalledWith("org-1", page);
    expect(customersService.listCustomers).toHaveBeenCalledWith("org-1", page);
    expect(articlesService.listArticles).toHaveBeenCalledWith("org-1", page);
    expect(prestationsService.listPrestations).toHaveBeenCalledWith("org-1", page);
    expect(invoicesService.listInvoices).toHaveBeenCalledWith("org-1", page);
  });

  it("should include invoices in global search and link to the case", async () => {
    const result = await service.search(user, "F-2026-00001");

    expect(result.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "inv-1",
          type: "invoice",
          title: "F-2026-00001",
          subtitle: expect.stringContaining("Toiture Dupont"),
          url: "/cases/case-99",
        }),
      ]),
    );
    expect(invoicesService.listInvoices).toHaveBeenCalledWith("org-1", {
      search: "f-2026-00001",
      limit: 50,
      offset: 0,
    });
  });

  it("should match invoices by customer name", async () => {
    const result = await service.search(user, "Dupont");

    expect(result.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "inv-1",
          type: "invoice",
          title: "F-2026-00001",
        }),
      ]),
    );
  });

  it("should return empty results for blank query", async () => {
    const result = await service.search(user, "   ");

    expect(result).toEqual({ query: "   ", results: [], counts: {} });
    expect(casesService.listCases).not.toHaveBeenCalled();
    expect(customersService.listCustomers).not.toHaveBeenCalled();
  });
});
