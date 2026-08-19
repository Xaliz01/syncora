import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { HttpService } from "@nestjs/axios";
import { of } from "rxjs";
import type {
  AuthUser,
  CaseResponse,
  CustomerResponse,
  OrderGiverResponse,
  QuoteResponse,
} from "@planwise/shared";
import { IntegrationsGatewayService } from "../integrations.service";
import { AbstractCasesGatewayService } from "../ports/cases.service.port";
import { AbstractCustomersGatewayService } from "../ports/customers.service.port";
import { AbstractOrderGiversGatewayService } from "../ports/order-givers.service.port";
import { AbstractSubscriptionsGatewayService } from "../ports/subscriptions.service.port";

describe("IntegrationsGatewayService prepareInvoiceSync billing party", () => {
  let service: IntegrationsGatewayService;
  let casesService: {
    getCase: jest.Mock;
    listQuotes: jest.Mock;
    getQuote: jest.Mock;
    updateCase: jest.Mock;
  };
  let customersService: { getCustomer: jest.Mock; listCustomersByIds: jest.Mock };
  let orderGiversService: { getOrderGiver: jest.Mock; listOrderGiversByIds: jest.Mock };
  let httpService: { get: jest.Mock; post: jest.Mock };

  const user: AuthUser = {
    id: "user-1",
    email: "user@example.com",
    organizationId: "org-1",
    role: "admin",
    status: "active",
    permissions: ["integrations.pennylane.sync"],
    name: "Admin",
  };

  const customer: CustomerResponse = {
    id: "cust-1",
    organizationId: "org-1",
    kind: "company",
    displayName: "Client SA",
    email: "client@example.com",
  };

  const orderGiver: OrderGiverResponse = {
    id: "og-1",
    organizationId: "org-1",
    kind: "company",
    displayName: "Donneur SA",
    email: "billing@donneur.fr",
    legalIdentifier: "FR123",
  };

  const quote: QuoteResponse = {
    id: "quote-1",
    organizationId: "org-1",
    caseId: "case-1",
    quoteNumber: "D-001",
    status: "accepted",
    lines: [
      {
        id: "line-1",
        description: "Prestation",
        quantity: 1,
        unitPrice: 100,
        tvaRate: 20,
        totalHt: 100,
        totalTtc: 120,
      },
    ],
    totalHt: 100,
    totalTva: 20,
    totalTtc: 120,
  };

  const baseCase: CaseResponse = {
    id: "case-1",
    organizationId: "org-1",
    customerId: customer.id,
    caseNumber: "2026-0001",
    title: "2026-0001 - Dossier",
    status: "completed",
    billingStatus: "to_invoice",
    priority: "medium",
    assignees: [],
    tags: [],
    steps: [],
    progress: 100,
    interventionCount: 1,
  };

  beforeEach(async () => {
    casesService = {
      getCase: jest.fn(),
      listQuotes: jest.fn().mockResolvedValue({ quotes: [{ id: quote.id, status: "accepted" }] }),
      getQuote: jest.fn().mockResolvedValue(quote),
      updateCase: jest.fn(),
    };
    customersService = {
      getCustomer: jest.fn().mockResolvedValue(customer),
      listCustomersByIds: jest.fn().mockResolvedValue([customer]),
    };
    orderGiversService = {
      getOrderGiver: jest.fn().mockResolvedValue(orderGiver),
      listOrderGiversByIds: jest.fn().mockResolvedValue([orderGiver]),
    };
    httpService = {
      get: jest.fn().mockReturnValue(of({ data: { invoices: [] } })),
      post: jest.fn().mockReturnValue(
        of({
          data: {
            syncId: "sync-1",
            remoteInvoiceId: "remote-1",
            remoteStatus: "draft",
            provider: "pennylane",
          },
        }),
      ),
    };

    const module = await Test.createTestingModule({
      providers: [
        IntegrationsGatewayService,
        { provide: HttpService, useValue: httpService },
        { provide: AbstractCasesGatewayService, useValue: casesService },
        { provide: AbstractCustomersGatewayService, useValue: customersService },
        { provide: AbstractOrderGiversGatewayService, useValue: orderGiversService },
        {
          provide: AbstractSubscriptionsGatewayService,
          useValue: {
            getCurrentSubscription: jest.fn().mockResolvedValue({
              status: "trialing",
              hasAccess: true,
            }),
          },
        },
      ],
    }).compile();

    service = module.get(IntegrationsGatewayService);
  });

  it("bills the customer when no order giver is set", async () => {
    casesService.getCase.mockResolvedValue(baseCase);

    await service.syncCaseToPennylane(user, "case-1", { quoteId: quote.id });

    expect(customersService.getCustomer).toHaveBeenCalledWith(user, customer.id);
    expect(orderGiversService.getOrderGiver).not.toHaveBeenCalled();
    const payload = httpService.post.mock.calls[0][1];
    expect(payload.customer.name).toBe("Client SA");
    expect(payload.customer.planwiseCustomerId).toBe("cust-1");
  });

  it("bills the order giver when set on the case", async () => {
    casesService.getCase.mockResolvedValue({
      ...baseCase,
      orderGiverId: orderGiver.id,
    });

    await service.syncCaseToPennylane(user, "case-1", { quoteId: quote.id });

    expect(orderGiversService.getOrderGiver).toHaveBeenCalledWith(user, orderGiver.id);
    expect(customersService.getCustomer).not.toHaveBeenCalled();
    const payload = httpService.post.mock.calls[0][1];
    expect(payload.customer.name).toBe("Donneur SA");
    expect(payload.customer.planwiseCustomerId).toBe("og-1");
  });

  it("syncs a draft invoice from custom lines without a quote", async () => {
    casesService.getCase.mockResolvedValue(baseCase);

    await service.syncCaseToPennylane(user, "case-1", {
      lines: [
        { label: "Pièce", quantity: 2, unitPriceHt: 25, tvaRate: 20, unit: "u" },
        { label: "Main d'œuvre", quantity: 1, unitPriceHt: 50, tvaRate: 20 },
      ],
    });

    expect(casesService.getQuote).not.toHaveBeenCalled();
    const payload = httpService.post.mock.calls[0][1];
    expect(payload.quoteId).toBeUndefined();
    expect(payload.invoiceKind).toBe("full");
    expect(payload.amountHt).toBe("100.00");
    expect(payload.lines).toEqual([
      {
        label: "Pièce",
        quantity: 2,
        unitPriceHt: "25.00",
        vatRate: "FR_200",
        unit: "u",
      },
      {
        label: "Main d'œuvre",
        quantity: 1,
        unitPriceHt: "50.00",
        vatRate: "FR_200",
        unit: undefined,
      },
    ]);
  });

  it("rejects sync without quote and without lines", async () => {
    casesService.getCase.mockResolvedValue(baseCase);

    await expect(service.syncCaseToPennylane(user, "case-1", {})).rejects.toThrow(
      BadRequestException,
    );
  });

  it("rejects when neither customer nor order giver is set", async () => {
    casesService.getCase.mockResolvedValue({
      ...baseCase,
      customerId: undefined,
      orderGiverId: undefined,
    });

    await expect(
      service.syncCaseToPennylane(user, "case-1", { quoteId: quote.id }),
    ).rejects.toThrow(BadRequestException);
  });
});
