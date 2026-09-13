import { BadRequestException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { Test } from "@nestjs/testing";
import type {
  AuthUser,
  CaseResponse,
  CustomerResponse,
  LocalInvoiceResponse,
  OrderGiverResponse,
  QuoteResponse,
} from "@planwise/shared";
import { BillingGatewayService } from "../billing.gateway.service";
import { OrganizationScopedHttpClient } from "../../infrastructure/organization-scoped-http.client";
import { AbstractCasesGatewayService } from "../ports/cases.service.port";
import { AbstractCustomersGatewayService } from "../ports/customers.service.port";
import { AbstractOrderGiversGatewayService } from "../ports/order-givers.service.port";
import { AbstractOrganizationsGatewayService } from "../ports/organizations.service.port";

describe("BillingGatewayService prepareInvoice billing party", () => {
  let service: BillingGatewayService;
  let casesService: {
    getCase: jest.Mock;
    listQuotes: jest.Mock;
    getQuote: jest.Mock;
    updateCase: jest.Mock;
    getIntervention: jest.Mock;
    setInterventionBillingStatus: jest.Mock;
  };
  let customersService: { getCustomer: jest.Mock };
  let orderGiversService: { getOrderGiver: jest.Mock };
  let organizationsService: { getMine: jest.Mock };
  let scopedHttp: { request: jest.Mock };

  const user: AuthUser = {
    id: "user-1",
    email: "user@example.com",
    organizationId: "org-1",
    role: "admin",
    status: "active",
    permissions: ["billing.invoices.create"],
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

  const createdInvoice: LocalInvoiceResponse = {
    id: "inv-1",
    organizationId: "org-1",
    caseId: "case-1",
    quoteId: quote.id,
    kind: "full",
    status: "draft",
    invoiceDate: "2026-09-01T00:00:00.000Z",
    amountHt: "100.00",
    amountTtc: "120.00",
    lines: [{ label: "Prestation", quantity: 1, unitPriceHt: "100.00", tvaRate: 20 }],
    customer: { partyId: "cust-1", partyType: "customer", displayName: "Client SA" },
  };

  beforeEach(async () => {
    casesService = {
      getCase: jest.fn(),
      listQuotes: jest.fn().mockResolvedValue([quote]),
      getQuote: jest.fn().mockResolvedValue(quote),
      updateCase: jest.fn(),
      getIntervention: jest.fn(),
      setInterventionBillingStatus: jest.fn().mockResolvedValue({}),
    };
    customersService = { getCustomer: jest.fn().mockResolvedValue(customer) };
    orderGiversService = { getOrderGiver: jest.fn().mockResolvedValue(orderGiver) };
    organizationsService = {
      getMine: jest.fn().mockResolvedValue({
        id: "org-1",
        name: "SARL Demo",
        siret: "123",
        legalForm: "SARL",
        invoiceMentions: { paymentTerms: "Paiement à 15 jours" },
      }),
    };
    scopedHttp = {
      request: jest.fn().mockImplementation(async (opts: { method: string; path: string }) => {
        if (opts.method === "get" && opts.path === "/invoices") {
          return { invoices: [], total: 0 };
        }
        if (opts.method === "post" && opts.path === "/invoices") {
          return createdInvoice;
        }
        if (opts.method === "post" && opts.path === "/invoices/render-pdf") {
          return Buffer.from("%PDF-preview");
        }
        if (opts.method === "post" && opts.path === "/invoices/inv-1/send") {
          return { ...createdInvoice, status: "finalized", emailSends: [] };
        }
        return {};
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        BillingGatewayService,
        { provide: OrganizationScopedHttpClient, useValue: scopedHttp },
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(() => {
              throw new Error("no logo");
            }),
          },
        },
        { provide: AbstractCasesGatewayService, useValue: casesService },
        { provide: AbstractCustomersGatewayService, useValue: customersService },
        { provide: AbstractOrderGiversGatewayService, useValue: orderGiversService },
        { provide: AbstractOrganizationsGatewayService, useValue: organizationsService },
      ],
    }).compile();

    service = module.get(BillingGatewayService);
  });

  it("bills the customer when no order giver is set", async () => {
    casesService.getCase.mockResolvedValue(baseCase);
    await service.createInvoice(user, "case-1", { quoteId: quote.id });
    expect(customersService.getCustomer).toHaveBeenCalledWith(user, customer.id);
    expect(orderGiversService.getOrderGiver).not.toHaveBeenCalled();
    const payload = scopedHttp.request.mock.calls.find(
      (call: [{ method: string; path: string }]) =>
        call[0].method === "post" && call[0].path === "/invoices",
    )?.[0];
    expect(payload.body.customer.displayName).toBe("Client SA");
    expect(payload.body.customer.partyId).toBe("cust-1");
    expect(payload.body.seller.legalForm).toBe("SARL");
    expect(payload.body.seller.mentions.paymentTerms).toBe("Paiement à 15 jours");
    expect(payload.body.seller.mentions.latePenalties).toMatch(/L441-10/);
  });

  it("bills the order giver when set on the case", async () => {
    casesService.getCase.mockResolvedValue({ ...baseCase, orderGiverId: orderGiver.id });
    await service.createInvoice(user, "case-1", { quoteId: quote.id });
    expect(orderGiversService.getOrderGiver).toHaveBeenCalledWith(user, orderGiver.id);
    expect(customersService.getCustomer).not.toHaveBeenCalled();
    const payload = scopedHttp.request.mock.calls.find(
      (call: [{ method: string; path: string }]) =>
        call[0].method === "post" && call[0].path === "/invoices",
    )?.[0];
    expect(payload.body.customer.displayName).toBe("Donneur SA");
    expect(payload.body.customer.partyType).toBe("order_giver");
  });

  it("creates a full invoice from custom lines without a quote", async () => {
    casesService.getCase.mockResolvedValue(baseCase);
    await service.createInvoice(user, "case-1", {
      lines: [
        { label: "Pièce", quantity: 2, unitPriceHt: 25, tvaRate: 20, unit: "u" },
        { label: "Main d'œuvre", quantity: 1, unitPriceHt: 50, tvaRate: 20 },
      ],
    });
    expect(casesService.getQuote).not.toHaveBeenCalled();
    const payload = scopedHttp.request.mock.calls.find(
      (call: [{ method: string; path: string }]) =>
        call[0].method === "post" && call[0].path === "/invoices",
    )?.[0];
    expect(payload.body.quoteId).toBeUndefined();
    expect(payload.body.kind).toBe("full");
    expect(payload.body.amountHt).toBe("100.00");
  });

  it("creates a custom-line invoice when the case billing status is none", async () => {
    casesService.getCase.mockResolvedValue({ ...baseCase, billingStatus: "none" });
    scopedHttp.request.mockImplementation(async (opts: { method: string; path: string }) => {
      if (opts.method === "get" && opts.path === "/invoices") {
        return { invoices: [{ ...createdInvoice, quoteId: undefined }], total: 1 };
      }
      if (opts.method === "post" && opts.path === "/invoices") {
        return { ...createdInvoice, quoteId: undefined };
      }
      return {};
    });
    await service.createInvoice(user, "case-1", {
      lines: [{ label: "Pièce", quantity: 1, unitPriceHt: 80, tvaRate: 20 }],
    });
    expect(casesService.getQuote).not.toHaveBeenCalled();
    expect(casesService.updateCase).toHaveBeenCalledWith(
      user,
      "case-1",
      expect.objectContaining({ billingStatus: "invoice_draft" }),
    );
  });

  it("still requires an accepted quote when creating without custom lines", async () => {
    casesService.getCase.mockResolvedValue({ ...baseCase, billingStatus: "none" });
    await expect(service.createInvoice(user, "case-1", { quoteId: quote.id })).rejects.toThrow(
      /À facturer/,
    );
  });

  it("creates a custom-line invoice linked to same-case interventions", async () => {
    casesService.getCase.mockResolvedValue(baseCase);
    casesService.getIntervention
      .mockResolvedValueOnce({
        id: "int-1",
        organizationId: "org-1",
        caseId: "case-1",
        billingStatus: "none",
      })
      .mockResolvedValueOnce({
        id: "int-2",
        organizationId: "org-1",
        caseId: "case-1",
        billingStatus: "to_invoice",
      })
      .mockResolvedValue({
        id: "int-1",
        organizationId: "org-1",
        caseId: "case-1",
        billingStatus: "none",
      });
    scopedHttp.request.mockImplementation(
      async (opts: { method: string; path: string; body?: { interventionIds?: string[] } }) => {
        if (opts.method === "get" && opts.path === "/invoices") {
          return { invoices: [], total: 0 };
        }
        if (opts.method === "post" && opts.path === "/invoices") {
          return { ...createdInvoice, interventionIds: opts.body?.interventionIds ?? [] };
        }
        return {};
      },
    );
    await service.createInvoice(user, "case-1", {
      lines: [{ label: "Pièce", quantity: 1, unitPriceHt: 40, tvaRate: 20 }],
      interventionIds: ["int-1", "int-2"],
    });
    const payload = scopedHttp.request.mock.calls.find(
      (call: [{ method: string; path: string }]) =>
        call[0].method === "post" && call[0].path === "/invoices",
    )?.[0];
    expect(payload.body.interventionIds).toEqual(["int-1", "int-2"]);
    expect(casesService.setInterventionBillingStatus).toHaveBeenCalledWith(
      user,
      "int-1",
      "invoice_draft",
    );
    expect(casesService.setInterventionBillingStatus).toHaveBeenCalledWith(
      user,
      "int-2",
      "invoice_draft",
    );
  });

  it("rejects intervention ids that belong to another case", async () => {
    casesService.getCase.mockResolvedValue(baseCase);
    casesService.getIntervention.mockResolvedValue({
      id: "int-x",
      organizationId: "org-1",
      caseId: "other-case",
      billingStatus: "none",
    });
    await expect(
      service.createInvoice(user, "case-1", {
        lines: [{ label: "Pièce", quantity: 1, unitPriceHt: 40, tvaRate: 20 }],
        interventionIds: ["int-x"],
      }),
    ).rejects.toThrow(/dossier facturé/);
    expect(scopedHttp.request).not.toHaveBeenCalledWith(
      expect.objectContaining({ method: "post", path: "/invoices" }),
    );
  });

  it("reverts intervention billing status when a draft is cancelled and no other invoice remains", async () => {
    const cancelled = {
      ...createdInvoice,
      status: "cancelled" as const,
      interventionIds: ["int-1"],
    };
    scopedHttp.request.mockImplementation(async (opts: { method: string; path: string }) => {
      if (opts.method === "get" && opts.path === "/invoices") {
        return { invoices: [cancelled], total: 1 };
      }
      if (opts.method === "post" && opts.path === "/invoices/inv-1/cancel") {
        return cancelled;
      }
      return {};
    });
    await service.cancelInvoice(user, "inv-1");
    expect(casesService.setInterventionBillingStatus).toHaveBeenCalledWith(
      user,
      "int-1",
      "to_invoice",
    );
  });

  it("rejects create without quote and without lines", async () => {
    casesService.getCase.mockResolvedValue(baseCase);
    casesService.listQuotes.mockResolvedValue([]);
    await expect(service.createInvoice(user, "case-1", {})).rejects.toThrow(/devis accepté/i);
  });

  it("rejects invoice creation from a non-accepted quote", async () => {
    casesService.getCase.mockResolvedValue(baseCase);
    casesService.getQuote.mockResolvedValue({ ...quote, status: "sent" });
    await expect(service.createInvoice(user, "case-1", { quoteId: quote.id })).rejects.toThrow(
      /devis accepté/i,
    );
    expect(scopedHttp.request).not.toHaveBeenCalledWith(
      expect.objectContaining({ method: "post", path: "/invoices" }),
    );
  });

  it("rejects invoice creation when the case has no accepted quote", async () => {
    casesService.getCase.mockResolvedValue(baseCase);
    casesService.listQuotes.mockResolvedValue([{ ...quote, status: "draft" }]);
    await expect(service.createInvoice(user, "case-1", {})).rejects.toThrow(/devis accepté/i);
  });

  it("rejects when neither customer nor order giver is set", async () => {
    casesService.getCase.mockResolvedValue({
      ...baseCase,
      customerId: undefined,
      orderGiverId: undefined,
    });
    await expect(service.createInvoice(user, "case-1", { quoteId: quote.id })).rejects.toThrow(
      BadRequestException,
    );
  });

  it("previews a draft PDF without persisting an invoice", async () => {
    casesService.getCase.mockResolvedValue(baseCase);
    const pdf = await service.previewInvoice(user, "case-1", { quoteId: quote.id });
    expect(Buffer.from(pdf).toString()).toContain("%PDF");
    const persistCall = scopedHttp.request.mock.calls.find(
      (call: [{ method: string; path: string }]) =>
        call[0].method === "post" && call[0].path === "/invoices",
    );
    expect(persistCall).toBeUndefined();
    const renderCall = scopedHttp.request.mock.calls.find(
      (call: [{ method: string; path: string }]) =>
        call[0].method === "post" && call[0].path === "/invoices/render-pdf",
    );
    expect(renderCall).toBeDefined();
    expect(renderCall?.[0].body.invoice.status).toBe("draft");
    expect(renderCall?.[0].body.invoice.seller.name).toBe("SARL Demo");
  });

  it("returns send history on list payloads", async () => {
    scopedHttp.request.mockResolvedValueOnce({
      invoices: [
        {
          id: "inv-1",
          organizationId: "org-1",
          emailSends: [
            {
              sentAt: "2026-09-10T12:00:00.000Z",
              to: "client@example.com",
              sentByUserId: "user-1",
              status: "sent",
            },
          ],
        },
      ],
      total: 1,
    });
    const listed = await service.listInvoices(user, { limit: 50, offset: 0 });
    expect(listed.invoices[0]?.emailSends).toHaveLength(1);
  });

  it("surfaces a 400 when sending a draft invoice", async () => {
    scopedHttp.request.mockRejectedValueOnce(
      new BadRequestException("Validez la facture avant de l’envoyer."),
    );
    await expect(
      service.sendInvoice(user, "inv-1", { to: "client@example.com" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("forwards send identity and organization on invoice email", async () => {
    await service.sendInvoice(user, "inv-1", {
      to: "client@example.com",
      subject: "Facture F-2026-00001",
      body: "Ci-joint",
    });
    expect(scopedHttp.request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "post",
        path: "/invoices/inv-1/send",
        organizationId: "org-1",
        body: expect.objectContaining({
          to: "client@example.com",
          subject: "Facture F-2026-00001",
          body: "Ci-joint",
          sentByUserId: "user-1",
          sentByName: "Admin",
        }),
      }),
    );
  });
});
