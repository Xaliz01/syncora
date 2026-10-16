import { Reflector } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { BillingController } from "../billing.controller";
import { AbstractBillingGatewayService } from "../../../domain/ports/billing.service.port";
import { JwtAuthGuard } from "../../../infrastructure/jwt-auth.guard";
import {
  REQUIRED_PERMISSIONS_KEY,
  RequirePermissionGuard,
} from "../../../infrastructure/require-permission.guard";
import { SubscriptionAccessGuard } from "../../../infrastructure/subscription-access.guard";
import type { AuthUser } from "@planwise/shared";

describe("BillingController", () => {
  let controller: BillingController;
  let billingService: {
    listInvoices: jest.Mock;
    createInvoice: jest.Mock;
    finalizeInvoice: jest.Mock;
    creditInvoice: jest.Mock;
    getInvoicePdf: jest.Mock;
    previewInvoice: jest.Mock;
    sendInvoice: jest.Mock;
  };

  const user: AuthUser = {
    id: "user-1",
    email: "user@example.com",
    organizationId: "org-1",
    role: "admin",
    status: "active",
    permissions: ["billing.invoices.read"],
    name: "Admin",
  };

  beforeEach(async () => {
    billingService = {
      listInvoices: jest.fn().mockResolvedValue({ invoices: [], total: 0 }),
      createInvoice: jest.fn().mockResolvedValue({ id: "inv-1", organizationId: "org-1" }),
      finalizeInvoice: jest.fn().mockResolvedValue({ id: "inv-1", status: "finalized" }),
      creditInvoice: jest.fn().mockResolvedValue({ id: "avoir-1", kind: "credit_note" }),
      getInvoicePdf: jest.fn().mockResolvedValue(Buffer.from("%PDF")),
      previewInvoice: jest.fn().mockResolvedValue(Buffer.from("%PDF")),
      sendInvoice: jest.fn().mockResolvedValue({ id: "inv-1", status: "finalized" }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BillingController],
      providers: [{ provide: AbstractBillingGatewayService, useValue: billingService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(SubscriptionAccessGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RequirePermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(BillingController);
  });

  it("lists invoices for the current organization", async () => {
    await controller.listInvoices(user);
    expect(billingService.listInvoices).toHaveBeenCalledWith(
      user,
      expect.objectContaining({ limit: expect.any(Number) }),
    );
  });

  it("creates an invoice from a case", async () => {
    await controller.createInvoice(user, "case-1", { quoteId: "q1" });
    expect(billingService.createInvoice).toHaveBeenCalledWith(user, "case-1", { quoteId: "q1" });
  });

  it("finalizes an invoice", async () => {
    await controller.finalizeInvoice(user, "inv-1");
    expect(billingService.finalizeInvoice).toHaveBeenCalledWith(user, "inv-1");
  });

  it("sends an invoice with the current user as sender", async () => {
    await controller.sendInvoice(user, "inv-1", {
      to: "client@example.com",
      subject: "Facture",
      body: "Ci-joint",
    });
    expect(billingService.sendInvoice).toHaveBeenCalledWith(user, "inv-1", {
      to: "client@example.com",
      subject: "Facture",
      body: "Ci-joint",
    });
  });

  it("requires billing.invoices.send to send an invoice", () => {
    const reflector = new Reflector();
    const required = reflector.get<string[] | undefined>(
      REQUIRED_PERMISSIONS_KEY,
      BillingController.prototype.sendInvoice,
    );
    expect(required).toEqual(["billing.invoices.send"]);
  });
});
