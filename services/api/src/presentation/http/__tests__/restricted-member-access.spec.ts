import { Test } from "@nestjs/testing";
import type { ExecutionContext, INestApplication } from "@nestjs/common";
import type { JwtPayload, PermissionCode } from "@planwise/shared";
import request from "supertest";
import { SearchController } from "../search.controller";
import { DocumentsController } from "../documents.controller";
import { SearchGatewayService } from "../../../domain/search.service";
import { DocumentsGatewayService } from "../../../domain/documents.service";
import { AbstractSearchService } from "../../../domain/ports/search.service.port";
import { AbstractDocumentsGatewayService } from "../../../domain/ports/documents.service.port";
import { AbstractCasesService } from "../../../domain/cases/ports/cases.service.port";
import { AbstractInterventionsService } from "../../../domain/cases/ports/interventions.service.port";
import { AbstractCustomersService } from "../../../domain/customers/ports/customers.service.port";
import { AbstractOrderGiversService } from "../../../domain/customers/ports/order-givers.service.port";
import { AbstractFleetService } from "../../../domain/fleet/ports/fleet.service.port";
import { AbstractTechniciansService } from "../../../domain/technicians/ports/technicians.service.port";
import { AbstractTeamsService } from "../../../domain/technicians/ports/teams.service.port";
import { AbstractAgencesService } from "../../../domain/technicians/ports/agences.service.port";
import { AbstractArticleStockService } from "../../../domain/stock/ports/article-stock.service.port";
import { AbstractPrestationService } from "../../../domain/stock/ports/prestation.service.port";
import { AbstractInvoicesService } from "../../../domain/billing/ports/invoices.service.port";
import { AbstractUsersService } from "../../../domain/users/ports/users.service.port";
import { AbstractPermissionsService } from "../../../domain/permissions/ports/permissions.service.port";
import { AbstractDocumentsService } from "../../../domain/documents/ports/documents.service.port";
import { AbstractSubscriptionsGatewayService } from "../../../domain/ports/subscriptions.service.port";
import { AbstractStorageProvider } from "../../../infrastructure/storage/storage.port";
import { AbstractOrganizationsService } from "../../../domain/organizations/ports/organizations.service.port";
import { JwtAuthGuard } from "../../../infrastructure/jwt-auth.guard";
import { SubscriptionAccessGuard } from "../../../infrastructure/subscription-access.guard";

describe("Restricted member access", () => {
  let app: INestApplication;
  let currentJwt: JwtPayload;
  let livePermissions: PermissionCode[];

  const invoices = {
    listInvoices: jest.fn().mockResolvedValue({
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
          lines: [],
          customer: {
            partyId: "cust-inv",
            partyType: "customer",
            displayName: "Toiture Dupont",
          },
          caseTitle: "Réfection toiture",
        },
      ],
      total: 1,
    }),
  };

  const customers = {
    listCustomers: jest.fn().mockResolvedValue({
      customers: [
        {
          id: "cust-1",
          organizationId: "org-1",
          kind: "company",
          displayName: "Dupont Services",
        },
      ],
      total: 1,
    }),
    getCustomer: jest.fn(),
  };

  const caseDocument = {
    id: "507f1f77bcf86cd799439011",
    organizationId: "org-1",
    entityType: "case" as const,
    entityId: "case-1",
    originalName: "rapport.pdf",
    mimeType: "application/pdf",
    size: 12,
    storageKey: "org-1/case/case-1/rapport.pdf",
    uploadedBy: "user-2",
    createdAt: "2026-01-01T00:00:00.000Z",
  };

  const documents = {
    upload: jest.fn().mockResolvedValue(caseDocument),
    listByEntity: jest.fn().mockResolvedValue([caseDocument]),
    getDownloadUrl: jest.fn().mockResolvedValue("https://files.example/rapport.pdf"),
    findActiveById: jest.fn().mockResolvedValue(caseDocument),
    findActiveByStorageKey: jest.fn().mockResolvedValue(caseDocument),
    deleteDocument: jest.fn().mockResolvedValue({ deleted: true }),
  };

  const emptyList = { listCases: jest.fn(), listInterventions: jest.fn() };

  function signIn(permissions: PermissionCode[]) {
    livePermissions = permissions;
    currentJwt = {
      sub: "member-1",
      email: "membre@test.fr",
      organizationId: "org-1",
      role: "member",
      status: "active",
      permissions,
      name: "Membre",
    };
  }

  beforeAll(async () => {
    signIn(["customers.read"]);

    const moduleRef = await Test.createTestingModule({
      controllers: [SearchController, DocumentsController],
      providers: [
        { provide: AbstractSearchService, useClass: SearchGatewayService },
        { provide: AbstractDocumentsGatewayService, useClass: DocumentsGatewayService },
        {
          provide: AbstractCasesService,
          useValue: {
            ...emptyList,
            listCases: jest.fn().mockResolvedValue({ cases: [], total: 0 }),
            getCase: jest.fn().mockResolvedValue({ title: "Chantier" }),
          },
        },
        {
          provide: AbstractInterventionsService,
          useValue: {
            listInterventions: jest.fn().mockResolvedValue({ interventions: [], total: 0 }),
            getIntervention: jest.fn(),
          },
        },
        { provide: AbstractCustomersService, useValue: customers },
        {
          provide: AbstractOrderGiversService,
          useValue: { listOrderGivers: jest.fn().mockResolvedValue({ orderGivers: [], total: 0 }) },
        },
        {
          provide: AbstractFleetService,
          useValue: { listVehicles: jest.fn(), getVehicle: jest.fn() },
        },
        {
          provide: AbstractTechniciansService,
          useValue: { listTechnicians: jest.fn(), getTechnician: jest.fn() },
        },
        {
          provide: AbstractTeamsService,
          useValue: { listTeams: jest.fn(), getTeam: jest.fn() },
        },
        { provide: AbstractAgencesService, useValue: { listAgences: jest.fn() } },
        {
          provide: AbstractArticleStockService,
          useValue: { listArticles: jest.fn().mockResolvedValue({ articles: [], total: 0 }) },
        },
        {
          provide: AbstractPrestationService,
          useValue: { listPrestations: jest.fn().mockResolvedValue({ prestations: [], total: 0 }) },
        },
        { provide: AbstractInvoicesService, useValue: invoices },
        { provide: AbstractUsersService, useValue: { listByOrganization: jest.fn() } },
        {
          provide: AbstractPermissionsService,
          useValue: {
            resolveEffectivePermissions: jest.fn(async () => ({ permissions: livePermissions })),
          },
        },
        { provide: AbstractDocumentsService, useValue: documents },
        { provide: AbstractStorageProvider, useValue: {} },
        {
          provide: AbstractSubscriptionsGatewayService,
          useValue: {
            getCurrentSubscription: jest.fn().mockResolvedValue({ storageQuotaBytes: 1 }),
          },
        },
        { provide: AbstractOrganizationsService, useValue: { findById: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          context.switchToHttp().getRequest().user = currentJwt;
          return true;
        },
      })
      .overrideGuard(SubscriptionAccessGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix("api");
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    signIn(["customers.read"]);
  });

  it("omits invoices from search when the member cannot read them", async () => {
    const response = await request(app.getHttpServer()).get("/api/search").query({ q: "Dupont" });

    expect(response.status).toBe(200);
    expect(response.body.results.map((item: { type: string }) => item.type)).toEqual(["customer"]);
    expect(invoices.listInvoices).not.toHaveBeenCalled();
    expect(customers.listCustomers).toHaveBeenCalledWith("org-1", {
      search: "dupont",
      limit: 50,
      offset: 0,
    });
  });

  it("returns invoices when the member holds billing.invoices.read", async () => {
    signIn(["customers.read", "billing.invoices.read"]);

    const response = await request(app.getHttpServer()).get("/api/search").query({ q: "Dupont" });

    expect(response.status).toBe(200);
    expect(response.body.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "invoice", id: "inv-1", title: "F-2026-00001" }),
        expect.objectContaining({ type: "customer", id: "cust-1" }),
      ]),
    );
    expect(invoices.listInvoices).toHaveBeenCalledWith("org-1", {
      search: "dupont",
      limit: 50,
      offset: 0,
    });
  });

  it("returns 403 for a document attached to an entity the member cannot read", async () => {
    const list = await request(app.getHttpServer()).get("/api/documents/case/case-1");
    const download = await request(app.getHttpServer()).get(
      `/api/documents/${caseDocument.id}/download-url`,
    );

    expect(list.status).toBe(403);
    expect(download.status).toBe(403);
    expect(list.body.message).toBe("Permissions insuffisantes");
    expect(documents.listByEntity).not.toHaveBeenCalled();
    expect(documents.getDownloadUrl).not.toHaveBeenCalled();
  });

  it("lists and downloads a document when the member can read the parent", async () => {
    signIn(["cases.read"]);

    const list = await request(app.getHttpServer()).get("/api/documents/case/case-1");
    const download = await request(app.getHttpServer()).get(
      `/api/documents/${caseDocument.id}/download-url`,
    );

    expect(list.status).toBe(200);
    expect(list.body).toEqual([caseDocument]);
    expect(download.status).toBe(200);
    expect(download.body.url).toBe("https://files.example/rapport.pdf");
    expect(documents.listByEntity).toHaveBeenCalledWith("org-1", "case", "case-1");
  });

  it("returns 403 on upload and delete without the parent update permission", async () => {
    signIn(["cases.read"]);

    const upload = await request(app.getHttpServer()).post("/api/documents/upload/case/case-1");
    const removal = await request(app.getHttpServer()).delete(`/api/documents/${caseDocument.id}`);

    expect(upload.status).toBe(403);
    expect(removal.status).toBe(403);
    expect(documents.upload).not.toHaveBeenCalled();
    expect(documents.deleteDocument).not.toHaveBeenCalled();
  });

  it("deletes a document when the member can update the parent", async () => {
    signIn(["cases.update"]);

    const removal = await request(app.getHttpServer()).delete(`/api/documents/${caseDocument.id}`);

    expect(removal.status).toBe(200);
    expect(removal.body).toEqual({ deleted: true });
    expect(documents.deleteDocument).toHaveBeenCalledWith("org-1", caseDocument.id);
  });
});
