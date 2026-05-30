import { Test } from "@nestjs/testing";
import { HttpService } from "@nestjs/axios";
import { of } from "rxjs";
import type { AuthUser, CaseResponse, CustomerResponse } from "@syncora/shared";
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
});
