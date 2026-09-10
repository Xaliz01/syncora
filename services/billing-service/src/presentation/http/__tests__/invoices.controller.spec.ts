import { Test, TestingModule } from "@nestjs/testing";
import { InvoicesController } from "../invoices.controller";
import { AbstractInvoicesService } from "../../../domain/ports/invoices.service.port";

describe("InvoicesController", () => {
  let controller: InvoicesController;
  let invoicesService: {
    createInvoice: jest.Mock;
    listInvoices: jest.Mock;
    getInvoice: jest.Mock;
    finalizeInvoice: jest.Mock;
    creditInvoice: jest.Mock;
    getInvoicePdf: jest.Mock;
    renderInvoicePdf: jest.Mock;
    sendInvoice: jest.Mock;
  };

  beforeEach(async () => {
    invoicesService = {
      createInvoice: jest.fn().mockResolvedValue({ id: "inv-1", organizationId: "org-1" }),
      listInvoices: jest.fn().mockResolvedValue({ invoices: [], total: 0 }),
      getInvoice: jest.fn().mockResolvedValue({ id: "inv-1", organizationId: "org-1" }),
      finalizeInvoice: jest.fn().mockResolvedValue({ id: "inv-1", status: "finalized" }),
      creditInvoice: jest.fn().mockResolvedValue({ id: "avoir-1", kind: "credit_note" }),
      getInvoicePdf: jest.fn().mockResolvedValue(Buffer.from("%PDF")),
      renderInvoicePdf: jest.fn().mockResolvedValue(Buffer.from("%PDF")),
      sendInvoice: jest.fn().mockResolvedValue({ id: "inv-1", status: "finalized" }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvoicesController],
      providers: [{ provide: AbstractInvoicesService, useValue: invoicesService }],
    }).compile();
    controller = module.get(InvoicesController);
  });

  it("creates an invoice", async () => {
    await controller.create({
      organizationId: "org-1",
      caseId: "case-1",
      kind: "full",
      amountHt: "10.00",
      lines: [{ label: "A", quantity: 1, unitPriceHt: "10.00", tvaRate: 20 }],
      customer: { partyId: "c1", partyType: "customer", displayName: "Client" },
    });
    expect(invoicesService.createInvoice).toHaveBeenCalled();
  });

  it("lists invoices scoped to the organization", async () => {
    await controller.list("org-1");
    expect(invoicesService.listInvoices).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({ limit: expect.any(Number) }),
    );
  });

  it("forwards search to listInvoices", async () => {
    await controller.list(
      "org-1",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      "F-2026",
    );
    expect(invoicesService.listInvoices).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({ search: "F-2026" }),
    );
  });

  it("finalizes an invoice", async () => {
    await controller.finalize("inv-1", { organizationId: "org-1" });
    expect(invoicesService.finalizeInvoice).toHaveBeenCalledWith("inv-1", "org-1");
  });

  it("credits an invoice", async () => {
    await controller.credit("inv-1", { organizationId: "org-1" });
    expect(invoicesService.creditInvoice).toHaveBeenCalled();
  });

  it("downloads a PDF", async () => {
    const file = await controller.pdf("inv-1", "org-1");
    expect(invoicesService.getInvoicePdf).toHaveBeenCalledWith("inv-1", "org-1");
    expect(file).toBeTruthy();
  });

  it("renders a PDF from an invoice snapshot", async () => {
    const file = await controller.renderPdf({
      organizationId: "org-1",
      invoice: {
        id: "preview",
        organizationId: "org-1",
        caseId: "case-1",
        kind: "full",
        status: "draft",
        invoiceDate: "2026-09-01T00:00:00.000Z",
        amountHt: "10.00",
        amountTtc: "12.00",
        lines: [{ label: "A", quantity: 1, unitPriceHt: "10.00", tvaRate: 20 }],
        customer: { partyId: "c1", partyType: "customer", displayName: "Client" },
      },
    });
    expect(invoicesService.renderInvoicePdf).toHaveBeenCalled();
    expect(file).toBeTruthy();
  });

  it("forwards send payload including sender identity", async () => {
    await controller.send("inv-1", {
      organizationId: "org-1",
      to: "client@example.com",
      cc: ["copie@example.com"],
      subject: "Facture F-2026-00001",
      body: "Ci-joint",
      sentByUserId: "user-1",
      sentByName: "Admin",
    });
    expect(invoicesService.sendInvoice).toHaveBeenCalledWith("inv-1", {
      organizationId: "org-1",
      to: "client@example.com",
      cc: ["copie@example.com"],
      subject: "Facture F-2026-00001",
      body: "Ci-joint",
      sentByUserId: "user-1",
      sentByName: "Admin",
    });
  });
});
