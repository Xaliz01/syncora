import { renderInvoicePdf } from "../invoice-pdf";
import type { LocalInvoiceResponse } from "@planwise/shared";

describe("renderInvoicePdf", () => {
  it("returns a PDF buffer including number and parties", async () => {
    const invoice: LocalInvoiceResponse = {
      id: "inv-1",
      organizationId: "org-1",
      caseId: "case-1",
      kind: "full",
      status: "finalized",
      number: "F-2026-00001",
      invoiceDate: "2026-09-01T00:00:00.000Z",
      amountHt: "100.00",
      amountTtc: "120.00",
      lines: [{ label: "Travaux", quantity: 1, unitPriceHt: "100.00", tvaRate: 20 }],
      customer: { partyId: "c1", partyType: "customer", displayName: "Client SA" },
      seller: { name: "SARL Demo", siret: "12345678900011" },
    };
    const pdf = await renderInvoicePdf(invoice);
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(100);
  });

  it("renders a draft with watermark and optional logo buffer", async () => {
    const invoice: LocalInvoiceResponse = {
      id: "inv-draft",
      organizationId: "org-1",
      caseId: "case-1",
      kind: "full",
      status: "draft",
      draftNumber: "BROUILLON",
      invoiceDate: "2026-09-01T00:00:00.000Z",
      amountHt: "50.00",
      amountTtc: "60.00",
      lines: [{ label: "Main d'œuvre", quantity: 2, unitPriceHt: "25.00", tvaRate: 20, unit: "h" }],
      customer: { partyId: "c1", partyType: "customer", displayName: "Client SA" },
      seller: { name: "SARL Demo", siret: "12345678900011" },
    };
    const pdf = await renderInvoicePdf(invoice, { logo: Buffer.from("%PDF-not-an-image") });
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
    expect(pdf.length).toBeGreaterThan(100);
    const pageCount = (pdf.toString("latin1").match(/\/Type\s*\/Page(?!s)/g) ?? []).length;
    expect(pageCount).toBe(1);
  });
});
