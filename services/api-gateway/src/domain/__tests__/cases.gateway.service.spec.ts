import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { HttpService } from "@nestjs/axios";
import { of } from "rxjs";
import type { AuthUser, CaseResponse, CustomerResponse, QuoteResponse } from "@planwise/shared";
import { CasesGatewayService } from "../cases.service";
import { OrganizationScopedHttpClient } from "../../infrastructure/organization-scoped-http.client";
import { AbstractCustomersGatewayService } from "../ports/customers.service.port";
import { AbstractOrderGiversGatewayService } from "../ports/order-givers.service.port";
import { AbstractCasesService } from "../cases/ports/cases.service.port";
import { AbstractInterventionsService } from "../cases/ports/interventions.service.port";
import { AbstractQuotesService } from "../cases/ports/quotes.service.port";
import { AbstractCommentsService } from "../cases/ports/comments.service.port";
import { AbstractCaseHistoryService } from "../cases/ports/case-history.service.port";
import { AbstractDashboardService } from "../cases/ports/dashboard.service.port";
import { AbstractCaseTemplatesService } from "../cases/ports/case-templates.service.port";
import { AbstractInterventionTypesService } from "../cases/ports/intervention-types.service.port";

describe("CasesGatewayService", () => {
  let service: CasesGatewayService;
  let scopedHttp: { request: jest.Mock };
  let customersGateway: { getCustomer: jest.Mock; listCustomersByIds: jest.Mock };
  let httpService: { get: jest.Mock; post: jest.Mock };
  let casesService: Record<string, jest.Mock>;
  let interventionsService: Record<string, jest.Mock>;
  let quotesService: Record<string, jest.Mock>;
  let caseHistoryService: Record<string, jest.Mock>;

  const user: AuthUser = {
    id: "user-1",
    email: "user@example.com",
    organizationId: "org-1",
    role: "member",
    status: "active",
    permissions: ["cases.read", "customers.read"],
    name: "User",
  };

  const customer: CustomerResponse = {
    id: "6a087ac1a3aecebc372f24ce",
    organizationId: "org-1",
    kind: "individual",
    displayName: "Eric Goutier",
    email: "mail@benoistbabin.fr",
    phone: "0781883229",
    address: {
      line1: "4 Avenue John Fitzgerald Kennedy",
      postalCode: "03100",
      city: "Montluçon",
      country: "FR",
    },
  };

  const caseRow: CaseResponse = {
    id: "case-1",
    organizationId: "org-1",
    customerId: customer.id,
    title: "2026-0001 - Dossier test",
    caseNumber: "2026-0001",
    status: "open",
    billingStatus: "none",
    priority: "medium",
    assignees: [],
    tags: [],
    steps: [],
    progress: 0,
    interventionCount: 0,
  };

  beforeEach(async () => {
    scopedHttp = { request: jest.fn() };
    customersGateway = {
      getCustomer: jest.fn(),
      listCustomersByIds: jest.fn(),
    };
    const orderGiversGateway = {
      getOrderGiver: jest.fn(),
      listOrderGiversByIds: jest.fn().mockResolvedValue([]),
    };
    httpService = {
      get: jest.fn().mockReturnValue(
        of({
          data: {
            organizationId: "org-1",
            userId: "user-1",
            profileId: "profile-1",
            extraPermissions: [],
            revokedPermissions: [],
            effectivePermissions: [],
          },
        }),
      ),
      post: jest.fn().mockReturnValue(of({ data: { sent: true } })),
    };
    casesService = {
      getCase: jest.fn(),
      createCase: jest.fn(),
      listCases: jest.fn(),
      updateCase: jest.fn(),
      deleteCase: jest.fn(),
      updateTodo: jest.fn(),
      listCaseIds: jest.fn(),
      createIntervention: jest.fn(),
      getTemplate: jest.fn(),
      purgeTestData: jest.fn(),
    };
    interventionsService = {
      createIntervention: jest.fn(),
      listInterventions: jest.fn(),
      getIntervention: jest.fn(),
      updateIntervention: jest.fn(),
      deleteIntervention: jest.fn(),
      startIntervention: jest.fn(),
      completeIntervention: jest.fn(),
      signIntervention: jest.fn(),
      getInterventionWithSignature: jest.fn(),
      listUpcomingInterventions: jest.fn(),
    };
    quotesService = {
      createQuote: jest.fn(),
      listQuotes: jest.fn(),
      getQuote: jest.fn(),
      updateQuote: jest.fn(),
      deleteQuote: jest.fn(),
      appendQuoteEmailSend: jest.fn(),
    };
    caseHistoryService = {
      addCaseHistory: jest.fn().mockResolvedValue({}),
      listCaseHistory: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        CasesGatewayService,
        { provide: AbstractCasesService, useValue: casesService },
        { provide: AbstractInterventionsService, useValue: interventionsService },
        { provide: AbstractQuotesService, useValue: quotesService },
        { provide: AbstractCommentsService, useValue: {} },
        { provide: AbstractCaseHistoryService, useValue: caseHistoryService },
        { provide: AbstractDashboardService, useValue: {} },
        { provide: AbstractCaseTemplatesService, useValue: {} },
        { provide: AbstractInterventionTypesService, useValue: {} },
        { provide: OrganizationScopedHttpClient, useValue: scopedHttp },
        { provide: AbstractCustomersGatewayService, useValue: customersGateway },
        {
          provide: AbstractOrderGiversGatewayService,
          useValue: orderGiversGateway,
        },
        { provide: HttpService, useValue: httpService },
      ],
    }).compile();

    service = module.get(CasesGatewayService);
  });

  describe("getCase", () => {
    it("enriches customer with contact fields for the case detail card", async () => {
      casesService.getCase.mockResolvedValue(caseRow);
      customersGateway.getCustomer.mockResolvedValue(customer);

      const result = await service.getCase(user, "case-1");

      expect(customersGateway.getCustomer).toHaveBeenCalledWith(user, customer.id);
      expect(result.customer).toEqual({
        id: customer.id,
        displayName: customer.displayName,
        kind: customer.kind,
        email: customer.email,
        phone: customer.phone,
        mobile: customer.mobile,
        address: customer.address,
      });
    });
  });

  describe("startIntervention", () => {
    it("calls domain service start and records history", async () => {
      const intervention = {
        id: "int-1",
        organizationId: "org-1",
        caseId: "case-1",
        title: "Intervention test",
        status: "planned",
      };
      const startResult = {
        id: "int-1",
        status: "in_progress",
        startedAt: "2026-06-06T10:00:00.000Z",
      };
      interventionsService.getIntervention.mockResolvedValue(intervention);
      interventionsService.startIntervention.mockResolvedValue(startResult);

      const result = await service.startIntervention(user, "int-1", {});

      expect(result.status).toBe("in_progress");
      expect(result.startedAt).toBeDefined();
      expect(interventionsService.startIntervention).toHaveBeenCalledWith("int-1", {
        organizationId: "org-1",
      });
    });

    it("forwards geolocation to domain service", async () => {
      const intervention = {
        id: "int-1",
        organizationId: "org-1",
        caseId: "case-1",
        title: "Intervention test",
        status: "planned",
      };
      const location = { latitude: 48.856, longitude: 2.352 };
      interventionsService.getIntervention.mockResolvedValue(intervention);
      interventionsService.startIntervention.mockResolvedValue({
        id: "int-1",
        status: "in_progress",
        startedAt: "2026-06-06T10:00:00.000Z",
        startLocation: location,
      });

      const result = await service.startIntervention(user, "int-1", { location });

      expect(interventionsService.startIntervention).toHaveBeenCalledWith("int-1", {
        organizationId: "org-1",
        location,
      });
      expect(result.startLocation).toEqual(location);
    });
  });

  describe("completeIntervention", () => {
    it("calls domain service complete and records history", async () => {
      const intervention = {
        id: "int-1",
        organizationId: "org-1",
        caseId: "case-1",
        title: "Intervention test",
        status: "in_progress",
      };
      const completeResult = {
        id: "int-1",
        status: "completed",
        completedAt: "2026-06-06T12:00:00.000Z",
      };
      interventionsService.getIntervention.mockResolvedValue(intervention);
      interventionsService.completeIntervention.mockResolvedValue(completeResult);

      const result = await service.completeIntervention(user, "int-1", {});

      expect(result.status).toBe("completed");
      expect(result.completedAt).toBeDefined();
      expect(interventionsService.completeIntervention).toHaveBeenCalledWith("int-1", {
        organizationId: "org-1",
      });
    });

    it("forwards notes and geolocation to domain service", async () => {
      const intervention = {
        id: "int-1",
        organizationId: "org-1",
        caseId: "case-1",
        title: "Intervention test",
        status: "in_progress",
      };
      const location = { latitude: 48.856, longitude: 2.352 };
      interventionsService.getIntervention.mockResolvedValue(intervention);
      interventionsService.completeIntervention.mockResolvedValue({
        id: "int-1",
        status: "completed",
        completedAt: "2026-06-06T12:00:00.000Z",
        endLocation: location,
      });

      const result = await service.completeIntervention(user, "int-1", {
        notes: "Travaux terminés",
        location,
      });

      expect(interventionsService.completeIntervention).toHaveBeenCalledWith("int-1", {
        organizationId: "org-1",
        notes: "Travaux terminés",
        location,
      });
      expect(result.endLocation).toEqual(location);
    });
  });

  describe("sendQuote", () => {
    const quote: QuoteResponse = {
      id: "quote-1",
      organizationId: "org-1",
      caseId: "case-1",
      quoteNumber: "DEV-2026-0001",
      status: "draft",
      lines: [],
      totalHt: 100,
      totalTva: 20,
      totalTtc: 120,
    };

    it("sends the PDF, persists the log and marks a draft as sent", async () => {
      const sentQuote: QuoteResponse = {
        ...quote,
        status: "sent",
        emailSends: [
          {
            sentAt: "2026-09-12T10:00:00.000Z",
            to: "client@example.com",
            sentByUserId: user.id,
            status: "sent",
          },
        ],
      };
      quotesService.getQuote.mockResolvedValue(quote);
      quotesService.appendQuoteEmailSend.mockResolvedValue(sentQuote);
      jest.spyOn(service, "generateQuotePdf").mockResolvedValue(Buffer.from("%PDF"));
      httpService.get.mockReturnValue(of({ data: { name: "Atelier Test" } }));

      const result = await service.sendQuote(user, "quote-1", { to: "client@example.com" });

      expect(result.status).toBe("sent");
      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining("/email/transactional"),
        expect.objectContaining({
          to: "client@example.com",
          attachments: expect.arrayContaining([
            expect.objectContaining({
              contentType: "application/pdf",
              filename: "DEV-2026-0001.pdf",
            }),
          ]),
        }),
        expect.objectContaining({ timeout: 60_000 }),
      );
      expect(quotesService.appendQuoteEmailSend).toHaveBeenCalledWith(
        "quote-1",
        "org-1",
        expect.objectContaining({ to: "client@example.com", status: "sent" }),
        { markSent: true },
      );
    });

    it("rejects a cancelled quote", async () => {
      quotesService.getQuote.mockResolvedValue({ ...quote, status: "cancelled" });
      await expect(
        service.sendQuote(user, "quote-1", { to: "client@example.com" }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(httpService.post).not.toHaveBeenCalled();
    });

    it("persists a failed send then throws a generic error", async () => {
      quotesService.getQuote.mockResolvedValue(quote);
      quotesService.appendQuoteEmailSend.mockResolvedValue({
        ...quote,
        emailSends: [{ status: "failed", to: "client@example.com" }],
      });
      jest.spyOn(service, "generateQuotePdf").mockResolvedValue(Buffer.from("%PDF"));
      httpService.post.mockReturnValue(
        of({ data: { sent: false, reason: "smtp_not_configured" } }),
      );

      await expect(
        service.sendQuote(user, "quote-1", { to: "client@example.com" }),
      ).rejects.toThrow(/pas disponible/);
      expect(quotesService.appendQuoteEmailSend).toHaveBeenCalledWith(
        "quote-1",
        "org-1",
        expect.objectContaining({ status: "failed" }),
        { markSent: false },
      );
    });
  });
});
