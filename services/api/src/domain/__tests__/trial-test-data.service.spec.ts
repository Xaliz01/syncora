import { BadRequestException, ConflictException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import type { AuthUser } from "@planwise/shared";
import { TrialTestDataService } from "../trial-test-data.service";
import { AbstractSubscriptionsGatewayService } from "../ports/subscriptions.service.port";
import { AbstractOrganizationsService } from "../organizations/ports/organizations.service.port";
import { AbstractAgencesService } from "../technicians/ports/agences.service.port";
import { AbstractTechniciansService } from "../technicians/ports/technicians.service.port";
import { AbstractTeamsService } from "../technicians/ports/teams.service.port";
import { TestDataPurgeService } from "../technicians/test-data-purge.service";
import { AbstractFleetService } from "../fleet/ports/fleet.service.port";
import { AbstractPermissionsService } from "../permissions/ports/permissions.service.port";
import { AbstractCaseTemplatesService } from "../cases/ports/case-templates.service.port";
import { AbstractInterventionTypesService } from "../cases/ports/intervention-types.service.port";
import { AbstractCasesService } from "../cases/ports/cases.service.port";
import { AbstractInterventionsService } from "../cases/ports/interventions.service.port";
import { AbstractCustomersService } from "../customers/ports/customers.service.port";
import { AbstractOrderGiversService } from "../customers/ports/order-givers.service.port";
import { AbstractArticleStockService } from "../stock/ports/article-stock.service.port";
import { AbstractPrestationService } from "../stock/ports/prestation.service.port";
import { AbstractStockLocationService } from "../stock/ports/stock-location.service.port";
import { AbstractIntegrationsService } from "../integrations/ports/integrations.service.port";

describe("TrialTestDataService", () => {
  let service: TrialTestDataService;
  const purgeIntegrations = jest.fn();
  const getCurrentSubscription = jest.fn();
  const getTrialTestDataStatus = jest.fn();
  const updateTrialTestData = jest.fn();
  const purgeCases = jest.fn();
  const purgeArticles = jest.fn();
  const purgePrestations = jest.fn();
  const purgeLocations = jest.fn();
  const purgeFleet = jest.fn();
  const purgeTechnicians = jest.fn();
  const purgeCustomers = jest.fn();
  const purgeOrderGivers = jest.fn();
  const purgePermissions = jest.fn();
  let createdSeq = 0;
  const created = jest.fn(async () => ({ id: `id-${++createdSeq}` }));

  const user: AuthUser = {
    id: "user-1",
    email: "a@test.fr",
    organizationId: "org-1",
    role: "admin",
    status: "active",
    permissions: ["subscription.active"],
    name: "Admin",
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    getTrialTestDataStatus.mockResolvedValue({
      status: "none",
      hasTestData: false,
      injectedAt: null,
    });
    updateTrialTestData.mockResolvedValue({
      status: "none",
      hasTestData: false,
      injectedAt: null,
    });
    purgeIntegrations.mockResolvedValue({ purged: true });
    getCurrentSubscription.mockResolvedValue({
      status: "trialing",
      hasAccess: true,
    });
    for (const fn of [
      purgeCases,
      purgeArticles,
      purgePrestations,
      purgeLocations,
      purgeFleet,
      purgeTechnicians,
      purgeCustomers,
      purgeOrderGivers,
      purgePermissions,
    ]) {
      fn.mockResolvedValue({ purged: true });
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrialTestDataService,
        {
          provide: AbstractSubscriptionsGatewayService,
          useValue: { getCurrentSubscription },
        },
        {
          provide: AbstractOrganizationsService,
          useValue: { getTrialTestDataStatus, updateTrialTestData },
        },
        { provide: AbstractAgencesService, useValue: { createAgence: created } },
        {
          provide: AbstractTechniciansService,
          useValue: {
            createTechnician: created,
            findByUserId: jest.fn().mockResolvedValue(null),
            linkUserToTechnician: created,
          },
        },
        { provide: AbstractTeamsService, useValue: { createTeam: created } },
        { provide: TestDataPurgeService, useValue: { purge: purgeTechnicians } },
        {
          provide: AbstractFleetService,
          useValue: { purgeTestData: purgeFleet, createVehicle: created, assignTeam: created },
        },
        {
          provide: AbstractPermissionsService,
          useValue: { purgeTestData: purgePermissions, createProfile: created },
        },
        { provide: AbstractCaseTemplatesService, useValue: { createTemplate: created } },
        {
          provide: AbstractInterventionTypesService,
          useValue: { list: jest.fn().mockResolvedValue({ types: [] }), create: created },
        },
        {
          provide: AbstractCasesService,
          useValue: { purgeTestData: purgeCases, createCase: created, updateCase: created },
        },
        { provide: AbstractInterventionsService, useValue: { createIntervention: created } },
        {
          provide: AbstractCustomersService,
          useValue: { purgeTestData: purgeCustomers, createCustomer: created },
        },
        { provide: AbstractOrderGiversService, useValue: { purgeTestData: purgeOrderGivers } },
        {
          provide: AbstractArticleStockService,
          useValue: { purgeTestData: purgeArticles, createArticle: created },
        },
        { provide: AbstractPrestationService, useValue: { purgeTestData: purgePrestations } },
        { provide: AbstractStockLocationService, useValue: { purgeTestData: purgeLocations } },
        { provide: AbstractIntegrationsService, useValue: { purgeTestData: purgeIntegrations } },
      ],
    }).compile();

    service = module.get(TrialTestDataService);
  });

  it("should reject inject when not trialing", async () => {
    getCurrentSubscription.mockResolvedValue({ status: "active", hasAccess: true });
    await expect(service.inject(user)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("should reject inject when demo data already ready", async () => {
    getTrialTestDataStatus.mockResolvedValue({
      status: "ready",
      hasTestData: true,
      injectedAt: new Date().toISOString(),
    });
    await expect(service.inject(user)).rejects.toBeInstanceOf(ConflictException);
  });

  it("should accept inject and mark organization as injecting", async () => {
    let settle: () => void = () => undefined;
    const settled = new Promise<void>((resolve) => {
      settle = resolve;
    });
    updateTrialTestData.mockImplementation(async (_id: string, body: { status: string }) => {
      if (body.status === "ready" || body.status === "failed") settle();
      return { status: body.status, hasTestData: false, injectedAt: null };
    });

    const result = await service.inject(user);
    expect(result).toEqual({ accepted: true });
    await settled;
    expect(updateTrialTestData).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({ status: "injecting" }),
    );
    expect(updateTrialTestData).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({ status: "ready" }),
    );
  });

  it("should purge domain test data and reset the organization flag", async () => {
    await service.purge(user);
    expect(purgeCases).toHaveBeenCalledWith("org-1");
    expect(purgeArticles).toHaveBeenCalledWith("org-1");
    expect(purgeFleet).toHaveBeenCalledWith("org-1");
    expect(purgeTechnicians).toHaveBeenCalledWith("org-1");
    expect(purgeCustomers).toHaveBeenCalledWith("org-1");
    expect(purgePermissions).toHaveBeenCalledWith("org-1");
    expect(purgeIntegrations).toHaveBeenCalledWith("org-1");
    expect(updateTrialTestData).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({ status: "none" }),
    );
  });
});
