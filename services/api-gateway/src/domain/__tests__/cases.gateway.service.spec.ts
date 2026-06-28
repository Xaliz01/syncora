import { Test } from "@nestjs/testing";
import { HttpService } from "@nestjs/axios";
import { of } from "rxjs";
import type { AuthUser, CaseResponse, CustomerResponse } from "@planwise/shared";
import { CasesGatewayService } from "../cases.service";
import { OrganizationScopedHttpClient } from "../../infrastructure/organization-scoped-http.client";
import { AbstractCustomersGatewayService } from "../ports/customers.service.port";

describe("CasesGatewayService", () => {
  let service: CasesGatewayService;
  let scopedHttp: { request: jest.Mock };
  let customersGateway: { getCustomer: jest.Mock; listCustomersByIds: jest.Mock };
  let httpService: { get: jest.Mock };

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
    title: "Dossier test",
    status: "open",
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
    };

    const module = await Test.createTestingModule({
      providers: [
        CasesGatewayService,
        { provide: OrganizationScopedHttpClient, useValue: scopedHttp },
        { provide: AbstractCustomersGatewayService, useValue: customersGateway },
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
});
