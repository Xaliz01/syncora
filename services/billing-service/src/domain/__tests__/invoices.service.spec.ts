import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { BadRequestException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { of } from "rxjs";
import { InvoicesService } from "../invoices.service";

function mockDoc(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => "inv-1" },
    organizationId: "org-1",
    caseId: "case-1",
    kind: "full",
    status: "draft",
    draftNumber: "BROUILLON-X",
    invoiceDate: new Date("2026-09-01"),
    amountHt: "100.00",
    amountTtc: "120.00",
    lines: [{ label: "Travaux", quantity: 1, unitPriceHt: "100.00", tvaRate: 20 }],
    customer: { partyId: "c1", partyType: "customer", displayName: "Client" },
    emailSends: [] as unknown[],
    get: jest.fn((key: string) =>
      key === "createdAt" ? new Date("2026-09-01") : new Date("2026-09-01"),
    ),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("InvoicesService", () => {
  let service: InvoicesService;
  let invoiceModel: {
    create: jest.Mock;
    findOne: jest.Mock;
    find: jest.Mock;
    countDocuments: jest.Mock;
  };
  let sequenceModel: { findOneAndUpdate: jest.Mock };
  let httpService: { post: jest.Mock };

  beforeEach(async () => {
    invoiceModel = {
      create: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
    };
    sequenceModel = {
      findOneAndUpdate: jest.fn(),
    };
    httpService = {
      post: jest.fn().mockReturnValue(of({ data: { sent: true } })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: getModelToken("Invoice"), useValue: invoiceModel },
        { provide: getModelToken("InvoiceSequence"), useValue: sequenceModel },
        { provide: HttpService, useValue: httpService },
      ],
    }).compile();

    service = module.get(InvoicesService);
  });

  it("creates a draft invoice without consuming the fiscal sequence", async () => {
    invoiceModel.create.mockResolvedValue(mockDoc());
    const result = await service.createInvoice({
      organizationId: "org-1",
      caseId: "case-1",
      kind: "full",
      amountHt: "100.00",
      lines: [{ label: "Travaux", quantity: 1, unitPriceHt: "100.00", tvaRate: 20 }],
      customer: { partyId: "c1", partyType: "customer", displayName: "Client" },
    });
    expect(result.status).toBe("draft");
    expect(sequenceModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("assigns consecutive numbers on finalize", async () => {
    const year = new Date().getUTCFullYear();
    const draft = mockDoc();
    invoiceModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(draft) });
    sequenceModel.findOneAndUpdate.mockResolvedValueOnce({ lastNumber: 1 });
    const first = await service.finalizeInvoice("inv-1", "org-1");
    expect(first.number).toBe(`F-${year}-00001`);
    expect(first.status).toBe("finalized");

    const draft2 = mockDoc({ _id: { toString: () => "inv-2" } });
    invoiceModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(draft2) });
    sequenceModel.findOneAndUpdate.mockResolvedValueOnce({ lastNumber: 2 });
    const second = await service.finalizeInvoice("inv-2", "org-1");
    expect(second.number).toBe(`F-${year}-00002`);
  });

  it("keeps snapshotted seller mentions when finalizing", async () => {
    const seller = {
      name: "SARL Demo",
      mentions: { paymentTerms: "Paiement à 15 jours" },
    };
    const draft = mockDoc({ seller });
    invoiceModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(draft) });
    sequenceModel.findOneAndUpdate.mockResolvedValueOnce({ lastNumber: 1 });
    const result = await service.finalizeInvoice("inv-1", "org-1");
    expect(result.seller).toEqual(seller);
    expect((draft as { seller?: unknown }).seller).toEqual(seller);
  });

  it("stores situation number on create", async () => {
    invoiceModel.create.mockResolvedValue(mockDoc({ kind: "situation", situationNumber: 2 }));
    const result = await service.createInvoice({
      organizationId: "org-1",
      caseId: "case-1",
      quoteId: "q1",
      kind: "situation",
      situationNumber: 2,
      situationPercent: 40,
      amountHt: "400.00",
      lines: [{ label: "Sit. 2", quantity: 1, unitPriceHt: "400.00", tvaRate: 20 }],
      customer: { partyId: "c1", partyType: "customer", displayName: "Client" },
    });
    expect(result.situationNumber).toBe(2);
  });

  it("persists intervention ids on create", async () => {
    invoiceModel.create.mockImplementation(async (payload: Record<string, unknown>) =>
      mockDoc({ interventionIds: payload.interventionIds }),
    );
    const result = await service.createInvoice({
      organizationId: "org-1",
      caseId: "case-1",
      kind: "full",
      amountHt: "100.00",
      lines: [{ label: "Pièce", quantity: 1, unitPriceHt: "100.00", tvaRate: 20 }],
      customer: { partyId: "c1", partyType: "customer", displayName: "Client" },
      interventionIds: [" int-1 ", "int-1", "int-2"],
    });
    expect(invoiceModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ interventionIds: ["int-1", "int-2"] }),
    );
    expect(result.interventionIds).toEqual(["int-1", "int-2"]);
  });

  it("rejects a credit note without original invoice id", async () => {
    await expect(
      service.createInvoice({
        organizationId: "org-1",
        caseId: "case-1",
        kind: "credit_note",
        amountHt: "-100.00",
        lines: [{ label: "Avoir", quantity: 1, unitPriceHt: "-100.00", tvaRate: 20 }],
        customer: { partyId: "c1", partyType: "customer", displayName: "Client" },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("issues a credit note with A- series", async () => {
    const original = mockDoc({
      status: "finalized",
      number: "F-2026-00001",
      amountHt: "100.00",
    });
    invoiceModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(original) });
    sequenceModel.findOneAndUpdate.mockResolvedValue({ lastNumber: 1 });
    invoiceModel.create.mockImplementation(async (payload: Record<string, unknown>) =>
      mockDoc({
        ...payload,
        _id: { toString: () => "avoir-1" },
        invoiceDate: new Date("2026-09-01"),
        kind: "credit_note",
        status: "finalized",
        number: "A-2026-00001",
      }),
    );
    const result = await service.creditInvoice("inv-1", { organizationId: "org-1" });
    expect(result.kind).toBe("credit_note");
    expect(result.number).toBe("A-2026-00001");
    expect(sequenceModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ series: "A" }),
      expect.anything(),
      expect.anything(),
    );
  });

  it("soft-deletes a draft on cancel without touching the fiscal sequence", async () => {
    const draft = mockDoc() as ReturnType<typeof mockDoc> & { deletedAt?: Date };
    invoiceModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(draft) });
    const result = await service.cancelInvoice("inv-1", "org-1");
    expect(result.status).toBe("cancelled");
    expect(draft.deletedAt).toBeInstanceOf(Date);
    expect(draft.save).toHaveBeenCalled();
    expect(sequenceModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("rejects cancel of a finalized invoice", async () => {
    invoiceModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockDoc({ status: "finalized", number: "F-2026-00001" })),
    });
    await expect(service.cancelInvoice("inv-1", "org-1")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(sequenceModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("filters the invoice list by search query", async () => {
    const execFind = jest.fn().mockResolvedValue([
      mockDoc({
        number: "F-2026-00001",
        status: "finalized",
        draftNumber: undefined,
        customer: { partyId: "c1", partyType: "customer", displayName: "Toiture Dupont" },
      }),
    ]);
    invoiceModel.find.mockReturnValue({
      sort: () => ({ skip: () => ({ limit: () => ({ exec: execFind }) }) }),
    });
    invoiceModel.countDocuments.mockReturnValue({ exec: jest.fn().mockResolvedValue(1) });

    const result = await service.listInvoices("org-1", { search: "F-2026" });

    expect(invoiceModel.find).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        $or: expect.arrayContaining([
          expect.objectContaining({ number: expect.objectContaining({ $regex: "F-2026" }) }),
          expect.objectContaining({
            "customer.displayName": expect.objectContaining({ $regex: "F-2026" }),
          }),
        ]),
      }),
    );
    expect(result.total).toBe(1);
    expect(result.invoices[0].number).toBe("F-2026-00001");
  });

  it("renders a PDF for a draft invoice", async () => {
    invoiceModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockDoc()) });
    const pdf = await service.getInvoicePdf("inv-1", "org-1");
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("rejects sending a draft invoice", async () => {
    invoiceModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(mockDoc()) });
    await expect(
      service.sendInvoice("inv-1", {
        organizationId: "org-1",
        to: "client@example.com",
        sentByUserId: "user-1",
        sentByName: "Admin",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(httpService.post).not.toHaveBeenCalled();
  });

  it("rejects sending a cancelled invoice", async () => {
    invoiceModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockDoc({ status: "cancelled" })),
    });
    await expect(
      service.sendInvoice("inv-1", {
        organizationId: "org-1",
        to: "client@example.com",
        sentByUserId: "user-1",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(httpService.post).not.toHaveBeenCalled();
  });

  it("rejects sending without a valid recipient", async () => {
    invoiceModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockDoc({ status: "finalized", number: "F-2026-00001" })),
    });
    await expect(
      service.sendInvoice("inv-1", {
        organizationId: "org-1",
        to: "pas-un-email",
        sentByUserId: "user-1",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(httpService.post).not.toHaveBeenCalled();
  });

  it("records a successful send and attaches the PDF", async () => {
    const issued = mockDoc({
      status: "finalized",
      number: "F-2026-00001",
      draftNumber: undefined,
    });
    invoiceModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(issued) });

    const result = await service.sendInvoice("inv-1", {
      organizationId: "org-1",
      to: "client@example.com",
      subject: "Facture F-2026-00001",
      body: "Ci-joint",
      sentByUserId: "user-1",
      sentByName: "Admin",
    });

    expect(httpService.post).toHaveBeenCalledWith(
      expect.stringContaining("/email/transactional"),
      expect.objectContaining({
        to: "client@example.com",
        subject: "Facture F-2026-00001",
        body: "Ci-joint",
        footer: expect.stringContaining("Document envoyé depuis Planwise"),
        attachments: [
          expect.objectContaining({
            filename: "F-2026-00001.pdf",
            contentType: "application/pdf",
          }),
        ],
      }),
    );
    expect(httpService.post.mock.calls[0]?.[1]).not.toHaveProperty("url");
    expect(httpService.post.mock.calls[0]?.[1]).not.toHaveProperty("ctaLabel");
    expect(result.emailSends).toHaveLength(1);
    expect(result.emailSends?.[0]).toEqual(
      expect.objectContaining({
        to: "client@example.com",
        status: "sent",
        sentByUserId: "user-1",
        sentByName: "Admin",
      }),
    );
  });

  it("records a failed SMTP send then still allows a second attempt", async () => {
    const issued = mockDoc({
      status: "finalized",
      number: "F-2026-00001",
      draftNumber: undefined,
    });
    invoiceModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(issued) });
    httpService.post.mockReturnValueOnce(
      of({ data: { sent: false, reason: "smtp_not_configured" } }),
    );

    await expect(
      service.sendInvoice("inv-1", {
        organizationId: "org-1",
        to: "client@example.com",
        sentByUserId: "user-1",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(issued.emailSends).toHaveLength(1);
    expect((issued.emailSends as { status: string }[])[0].status).toBe("failed");

    httpService.post.mockReturnValueOnce(of({ data: { sent: true } }));
    const result = await service.sendInvoice("inv-1", {
      organizationId: "org-1",
      to: "client@example.com",
      sentByUserId: "user-1",
    });
    expect(result.emailSends).toHaveLength(2);
    expect(result.emailSends?.[1]?.status).toBe("sent");
  });

  it("allows sending a paid invoice", async () => {
    const issued = mockDoc({
      status: "paid",
      number: "F-2026-00002",
      draftNumber: undefined,
    });
    invoiceModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(issued) });
    await service.sendInvoice("inv-1", {
      organizationId: "org-1",
      to: "client@example.com",
      sentByUserId: "user-1",
    });
    expect(httpService.post).toHaveBeenCalled();
    expect(issued.emailSends).toHaveLength(1);
  });
});
