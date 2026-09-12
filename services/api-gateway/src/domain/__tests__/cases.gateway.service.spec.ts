import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { HttpService } from "@nestjs/axios";
import { of } from "rxjs";
import type { AuthUser, CaseResponse, CustomerResponse, QuoteResponse } from "@planwise/shared";
import { CasesGatewayService } from "../cases.service";
import { OrganizationScopedHttpClient } from "../../infrastructure/organization-scoped-http.client";
import { AbstractCustomersGatewayService } from "../ports/customers.service.port";
import { AbstractOrderGiversGatewayService } from "../ports/order-givers.service.port";

describe("CasesGatewayService", () => {
  let service: CasesGatewayService;
  let scopedHttp: { request: jest.Mock };
  let customersGateway: { getCustomer: jest.Mock; listCustomersByIds: jest.Mock };
  let httpService: { get: jest.Mock; post: jest.Mock };

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

    const module = await Test.createTestingModule({
      providers: [
        CasesGatewayService,
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
      scopedHttp.request.mockResolvedValue(caseRow);
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
    it("calls cases-service start endpoint and records history", async () => {
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
      scopedHttp.request
        .mockResolvedValueOnce(intervention)
        .mockResolvedValueOnce(startResult)
        .mockResolvedValueOnce({});

      const result = await service.startIntervention(user, "int-1", {});

      expect(result.status).toBe("in_progress");
      expect(result.startedAt).toBeDefined();
      expect(scopedHttp.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "post",
          path: "/interventions/int-1/start",
        }),
      );
    });

    it("forwards geolocation to cases-service", async () => {
      const intervention = {
        id: "int-1",
        organizationId: "org-1",
        caseId: "case-1",
        title: "Intervention test",
        status: "planned",
      };
      const location = { latitude: 48.856, longitude: 2.352 };
      scopedHttp.request
        .mockResolvedValueOnce(intervention)
        .mockResolvedValueOnce({
          id: "int-1",
          status: "in_progress",
          startedAt: "2026-06-06T10:00:00.000Z",
          startLocation: location,
        })
        .mockResolvedValueOnce({});

      const result = await service.startIntervention(user, "int-1", { location });

      expect(scopedHttp.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "post",
          path: "/interventions/int-1/start",
          body: expect.objectContaining({ location }),
        }),
      );
      expect(result.startLocation).toEqual(location);
    });
  });

  describe("completeIntervention", () => {
    it("calls cases-service complete endpoint and records history", async () => {
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
      scopedHttp.request
        .mockResolvedValueOnce(intervention)
        .mockResolvedValueOnce(completeResult)
        .mockResolvedValueOnce({});

      const result = await service.completeIntervention(user, "int-1", {});

      expect(result.status).toBe("completed");
      expect(result.completedAt).toBeDefined();
      expect(scopedHttp.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "post",
          path: "/interventions/int-1/complete",
        }),
      );
    });

    it("forwards notes and geolocation to cases-service", async () => {
      const intervention = {
        id: "int-1",
        organizationId: "org-1",
        caseId: "case-1",
        title: "Intervention test",
        status: "in_progress",
      };
      const location = { latitude: 48.856, longitude: 2.352 };
      scopedHttp.request
        .mockResolvedValueOnce(intervention)
        .mockResolvedValueOnce({
          id: "int-1",
          status: "completed",
          completedAt: "2026-06-06T12:00:00.000Z",
          endLocation: location,
        })
        .mockResolvedValueOnce({});

      const result = await service.completeIntervention(user, "int-1", {
        notes: "Travaux terminés",
        location,
      });

      expect(scopedHttp.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "post",
          path: "/interventions/int-1/complete",
          body: expect.objectContaining({
            notes: "Travaux terminés",
            location,
          }),
        }),
      );
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
      scopedHttp.request.mockImplementation(async (opts: { method: string; path: string }) => {
        if (opts.method === "get" && opts.path === "/quotes/quote-1") return quote;
        if (opts.method === "post" && opts.path === "/quotes/quote-1/email-sends") return sentQuote;
        return {};
      });
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
      expect(scopedHttp.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "post",
          path: "/quotes/quote-1/email-sends",
          body: expect.objectContaining({
            markSent: true,
            entry: expect.objectContaining({ to: "client@example.com", status: "sent" }),
          }),
        }),
      );
    });

    it("rejects a cancelled quote", async () => {
      scopedHttp.request.mockResolvedValue({ ...quote, status: "cancelled" });
      await expect(
        service.sendQuote(user, "quote-1", { to: "client@example.com" }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(httpService.post).not.toHaveBeenCalled();
    });

    it("persists a failed send then throws a generic error", async () => {
      scopedHttp.request.mockImplementation(async (opts: { method: string; path: string }) => {
        if (opts.method === "get" && opts.path === "/quotes/quote-1") return quote;
        if (opts.method === "post" && opts.path === "/quotes/quote-1/email-sends") {
          return { ...quote, emailSends: [{ status: "failed", to: "client@example.com" }] };
        }
        return {};
      });
      jest.spyOn(service, "generateQuotePdf").mockResolvedValue(Buffer.from("%PDF"));
      httpService.post.mockReturnValue(
        of({ data: { sent: false, reason: "smtp_not_configured" } }),
      );

      await expect(
        service.sendQuote(user, "quote-1", { to: "client@example.com" }),
      ).rejects.toThrow(/pas disponible/);
      expect(scopedHttp.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "post",
          path: "/quotes/quote-1/email-sends",
          body: expect.objectContaining({
            markSent: false,
            entry: expect.objectContaining({ status: "failed" }),
          }),
        }),
      );
    });
  });
});
