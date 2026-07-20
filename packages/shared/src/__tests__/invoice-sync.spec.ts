import {
  aggregateCaseBillingStatus,
  buildInvoiceLinesFromQuote,
  nextSituationNumber,
  quoteInvoicedHt,
  remainingQuoteHt,
  remainingQuotePercent,
  sumInvoiceAmountsHt,
} from "../integrations";
import { shouldSetToInvoiceOnQuoteAccepted } from "../case";

describe("invoice sync helpers", () => {
  it("sums active invoice amounts", () => {
    expect(
      sumInvoiceAmountsHt([
        { amountHt: "100.00", remoteStatus: "finalized" },
        { amountHt: "50.50", remoteStatus: "paid" },
        { amountHt: "10.00", remoteStatus: "cancelled" },
      ]),
    ).toBe(150.5);
  });

  it("computes remaining quote amounts including drafts", () => {
    const invoiced = quoteInvoicedHt(
      [
        { quoteId: "q1", amountHt: "300.00", remoteStatus: "draft" },
        { quoteId: "q1", amountHt: "100.00", remoteStatus: "cancelled" },
        { quoteId: "q2", amountHt: "50.00", remoteStatus: "paid" },
      ],
      "q1",
    );
    expect(invoiced).toBe(300);
    expect(remainingQuoteHt(1000, invoiced)).toBe(700);
    expect(remainingQuotePercent(1000, 700)).toBe(70);
  });

  it("promotes case to to_invoice only when not already further", () => {
    expect(shouldSetToInvoiceOnQuoteAccepted("none")).toBe(true);
    expect(shouldSetToInvoiceOnQuoteAccepted("to_invoice")).toBe(false);
    expect(shouldSetToInvoiceOnQuoteAccepted("partially_invoiced")).toBe(false);
  });

  it("aggregates to partially_invoiced when remaining exists", () => {
    expect(
      aggregateCaseBillingStatus(
        [
          { remoteStatus: "finalized", amountHt: "400.00", invoiceKind: "situation" },
          { remoteStatus: "draft", amountHt: "200.00", invoiceKind: "situation" },
        ],
        1000,
      ),
    ).toBe("partially_invoiced");
  });

  it("aggregates to paid when fully covered and all paid", () => {
    expect(aggregateCaseBillingStatus([{ remoteStatus: "paid", amountHt: "1000.00" }], 1000)).toBe(
      "paid",
    );
  });

  it("builds situation lines from percent", () => {
    const result = buildInvoiceLinesFromQuote({
      caseTitle: "Chantier",
      quoteTotalHt: 1000,
      quoteLines: [{ label: "Travaux", quantity: 10, unitPriceHt: "100.00", tvaRate: 20 }],
      invoiceKind: "situation",
      situationPercent: 30,
      alreadyInvoicedHt: 0,
      situationNumber: 1,
    });
    expect(result.amountHt).toBe("300.00");
    expect(result.lines[0]?.quantity).toBe(3);
    expect(result.situationPercent).toBe(30);
  });

  it("rejects a situation percent that exceeds the remaining quote", () => {
    expect(() =>
      buildInvoiceLinesFromQuote({
        caseTitle: "Chantier",
        quoteTotalHt: 1000,
        quoteLines: [{ label: "Travaux", quantity: 10, unitPriceHt: "100.00", tvaRate: 20 }],
        invoiceKind: "situation",
        situationPercent: 80,
        alreadyInvoicedHt: 300,
        situationNumber: 2,
      }),
    ).toThrow(/reste à facturer/);
  });

  it("allows a situation within the remaining quote", () => {
    const result = buildInvoiceLinesFromQuote({
      caseTitle: "Chantier",
      quoteTotalHt: 1000,
      quoteLines: [{ label: "Travaux", quantity: 10, unitPriceHt: "100.00", tvaRate: 20 }],
      invoiceKind: "situation",
      situationPercent: 70,
      alreadyInvoicedHt: 300,
      situationNumber: 2,
    });
    expect(result.amountHt).toBe("700.00");
  });

  it("rejects a full invoice when the quote is already partially invoiced", () => {
    expect(() =>
      buildInvoiceLinesFromQuote({
        caseTitle: "Chantier",
        quoteTotalHt: 1000,
        quoteLines: [{ label: "Travaux", quantity: 1, unitPriceHt: "1000.00", tvaRate: 20 }],
        invoiceKind: "full",
        alreadyInvoicedHt: 300,
      }),
    ).toThrow(/facture complète n’est plus possible/);
  });

  it("builds balance from remaining", () => {
    const result = buildInvoiceLinesFromQuote({
      caseTitle: "Chantier",
      quoteSubject: "Devis A",
      quoteTotalHt: 1000,
      quoteLines: [{ label: "Travaux", quantity: 1, unitPriceHt: "1000.00", tvaRate: 20 }],
      invoiceKind: "balance",
      alreadyInvoicedHt: 700,
    });
    expect(result.amountHt).toBe("300.00");
    expect(result.lines[0]?.label).toContain("Solde");
  });

  it("computes next situation number", () => {
    expect(
      nextSituationNumber(
        [
          { quoteId: "q1", invoiceKind: "situation", situationNumber: 1, remoteStatus: "paid" },
          { quoteId: "q1", invoiceKind: "situation", situationNumber: 2, remoteStatus: "draft" },
          { quoteId: "q2", invoiceKind: "situation", situationNumber: 9, remoteStatus: "paid" },
        ],
        "q1",
      ),
    ).toBe(3);
  });
});
