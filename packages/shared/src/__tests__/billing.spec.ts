import {
  buildCreditNoteLines,
  defaultInvoiceEmailBody,
  defaultInvoiceEmailSubject,
  invoiceEmailFailureMessage,
  invoiceTotalsFromLines,
  isIssuedInvoiceStatus,
  isValidEmailAddress,
  localInvoiceStatusToRemote,
} from "../billing";

describe("local billing helpers", () => {
  it("builds a full credit note with negated amounts", () => {
    const result = buildCreditNoteLines({
      originalLines: [{ label: "Travaux", quantity: 2, unitPriceHt: "100.00", tvaRate: 20 }],
      originalAmountHt: 200,
      originalNumber: "F-2026-00001",
    });
    expect(result.amountHt).toBe("-200.00");
    expect(result.lines[0]?.unitPriceHt).toBe("-100.00");
    expect(result.lines[0]?.label).toContain("Avoir");
  });

  it("rejects a credit above the original amount", () => {
    expect(() =>
      buildCreditNoteLines({
        originalLines: [{ label: "Travaux", quantity: 1, unitPriceHt: "50.00", tvaRate: 20 }],
        originalAmountHt: 50,
        creditAmountHt: 80,
      }),
    ).toThrow(/dépasser/);
  });

  it("maps local status to remote lifecycle", () => {
    expect(localInvoiceStatusToRemote("draft")).toBe("draft");
    expect(localInvoiceStatusToRemote("finalized")).toBe("finalized");
  });

  it("computes TTC from lines", () => {
    const totals = invoiceTotalsFromLines([
      { label: "A", quantity: 1, unitPriceHt: "100.00", tvaRate: 20 },
    ]);
    expect(totals.amountHt).toBe("100.00");
    expect(totals.amountTtc).toBe("120.00");
  });
});

describe("invoice email helpers", () => {
  it("accepts a simple e-mail and rejects blanks", () => {
    expect(isValidEmailAddress("client@example.fr")).toBe(true);
    expect(isValidEmailAddress("  ")).toBe(false);
    expect(isValidEmailAddress("pas-un-email")).toBe(false);
  });

  it("builds a default subject and body from the invoice", () => {
    expect(defaultInvoiceEmailSubject({ kind: "full", number: "F-2026-00001" })).toBe(
      "Facture F-2026-00001",
    );
    expect(defaultInvoiceEmailSubject({ kind: "credit_note", number: "A-2026-00001" })).toBe(
      "Avoir A-2026-00001",
    );
    expect(
      defaultInvoiceEmailBody({
        kind: "full",
        number: "F-2026-00001",
        amountHt: "150.00",
        seller: { name: "Atelier Dupont" },
      }),
    ).toContain("la facture F-2026-00001");
  });

  it("marks only finalized and paid invoices as issued", () => {
    expect(isIssuedInvoiceStatus("finalized")).toBe(true);
    expect(isIssuedInvoiceStatus("paid")).toBe(true);
    expect(isIssuedInvoiceStatus("draft")).toBe(false);
    expect(isIssuedInvoiceStatus("cancelled")).toBe(false);
  });

  it("maps SMTP failures to a user-facing message", () => {
    expect(invoiceEmailFailureMessage("smtp_not_configured")).toMatch(/pas disponible/);
    expect(invoiceEmailFailureMessage("localhost")).toMatch(/n’a pas pu aboutir/);
  });
});
