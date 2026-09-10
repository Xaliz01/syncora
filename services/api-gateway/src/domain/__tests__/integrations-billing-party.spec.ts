import { GoneException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { HttpService } from "@nestjs/axios";
import type { AuthUser } from "@planwise/shared";
import { BILLING_CONNECTORS_UNAVAILABLE_MESSAGE } from "@planwise/shared";
import { IntegrationsGatewayService } from "../integrations.service";
import { AbstractCasesGatewayService } from "../ports/cases.service.port";
import { AbstractCustomersGatewayService } from "../ports/customers.service.port";
import { AbstractOrderGiversGatewayService } from "../ports/order-givers.service.port";

describe("IntegrationsGatewayService billing connectors unavailable", () => {
  let service: IntegrationsGatewayService;

  const user: AuthUser = {
    id: "user-1",
    email: "user@example.com",
    organizationId: "org-1",
    role: "admin",
    status: "active",
    permissions: ["integrations.pennylane.sync"],
    name: "Admin",
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        IntegrationsGatewayService,
        { provide: HttpService, useValue: { get: jest.fn(), post: jest.fn() } },
        { provide: AbstractCasesGatewayService, useValue: {} },
        { provide: AbstractCustomersGatewayService, useValue: {} },
        { provide: AbstractOrderGiversGatewayService, useValue: {} },
      ],
    }).compile();

    service = module.get(IntegrationsGatewayService);
  });

  it("returns 410 Gone for provider invoice sync", async () => {
    await expect(
      service.syncCaseToPennylane(user, "case-1", { quoteId: "q1" }),
    ).rejects.toBeInstanceOf(GoneException);
    await expect(service.syncCaseToQonto(user, "case-1", { quoteId: "q1" })).rejects.toThrow(
      BILLING_CONNECTORS_UNAVAILABLE_MESSAGE,
    );
    await expect(service.connectPennylane(user, { apiToken: "x" })).rejects.toBeInstanceOf(
      GoneException,
    );
  });

  it("returns 410 Gone for provider status reads", async () => {
    await expect(service.getPennylaneStatus(user)).rejects.toBeInstanceOf(GoneException);
    await expect(service.getQontoStatus(user)).rejects.toThrow(
      BILLING_CONNECTORS_UNAVAILABLE_MESSAGE,
    );
    await expect(service.getDemoStatus(user)).rejects.toBeInstanceOf(GoneException);
  });

  it("reports no billing connector as available", async () => {
    await expect(service.getBillingIntegrationAvailability(user)).resolves.toEqual({
      connected: false,
      pennylane: false,
      qonto: false,
      demo: false,
      demoAvailable: false,
    });
  });
});
