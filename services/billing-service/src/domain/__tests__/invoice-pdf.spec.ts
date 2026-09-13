import zlib from "zlib";
import { renderInvoicePdf } from "../invoice-pdf";
import { DEFAULT_INVOICE_MENTIONS_FR, type LocalInvoiceResponse } from "@planwise/shared";

function extractPdfContent(pdf: Buffer): string {
  const raw = pdf.toString("latin1");
  const streams = [...raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)]
    .map((match) => {
      try {
        return zlib.inflateSync(Buffer.from(match[1], "latin1")).toString("latin1");
      } catch {
        return "";
      }
    })
    .join("\n");
  return [...streams.matchAll(/<([0-9a-fA-F]+)>/g)]
    .map((match) => Buffer.from(match[1], "hex").toString("latin1"))
    .join("");
}

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
    const body = extractPdfContent(pdf);
    expect(body).toContain("Mentions");
    expect(body).toContain("40");
    expect(body).toContain(DEFAULT_INVOICE_MENTIONS_FR.recoveryIndemnity.slice(0, 12));
  });

  it("renders snapshotted custom mentions instead of defaults", async () => {
    const invoice: LocalInvoiceResponse = {
      id: "inv-2",
      organizationId: "org-1",
      caseId: "case-1",
      kind: "full",
      status: "finalized",
      number: "F-2026-00002",
      invoiceDate: "2026-09-01T00:00:00.000Z",
      amountHt: "100.00",
      amountTtc: "120.00",
      lines: [{ label: "Travaux", quantity: 1, unitPriceHt: "100.00", tvaRate: 20 }],
      customer: { partyId: "c1", partyType: "customer", displayName: "Client SA" },
      seller: {
        name: "SARL Demo",
        siret: "12345678900011",
        legalForm: "SARL",
        mentions: { paymentTerms: "Paiement a 15 jours net" },
      },
    };
    const pdf = await renderInvoicePdf(invoice);
    expect(extractPdfContent(pdf)).toContain("Paiement a 15 jours net");
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
