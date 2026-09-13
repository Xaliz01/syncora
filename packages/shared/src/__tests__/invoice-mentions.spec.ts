import {
  DEFAULT_INVOICE_MENTIONS_FR,
  resolveInvoiceMentions,
  sanitizeInvoiceMentions,
} from "../invoice-mentions";

describe("resolveInvoiceMentions", () => {
  it("falls back to French defaults when keys are empty or missing", () => {
    expect(resolveInvoiceMentions(undefined)).toEqual({
      paymentTerms: DEFAULT_INVOICE_MENTIONS_FR.paymentTerms,
      latePenalties: DEFAULT_INVOICE_MENTIONS_FR.latePenalties,
      recoveryIndemnity: DEFAULT_INVOICE_MENTIONS_FR.recoveryIndemnity,
      discount: DEFAULT_INVOICE_MENTIONS_FR.discount,
    });
    expect(resolveInvoiceMentions({ paymentTerms: "  ", latePenalties: "" })).toEqual({
      paymentTerms: DEFAULT_INVOICE_MENTIONS_FR.paymentTerms,
      latePenalties: DEFAULT_INVOICE_MENTIONS_FR.latePenalties,
      recoveryIndemnity: DEFAULT_INVOICE_MENTIONS_FR.recoveryIndemnity,
      discount: DEFAULT_INVOICE_MENTIONS_FR.discount,
    });
  });

  it("keeps custom texts and includes vatFranchise only when filled", () => {
    expect(
      resolveInvoiceMentions({
        paymentTerms: "Paiement à 15 jours",
        vatFranchise: DEFAULT_INVOICE_MENTIONS_FR.vatFranchise,
      }),
    ).toEqual({
      paymentTerms: "Paiement à 15 jours",
      latePenalties: DEFAULT_INVOICE_MENTIONS_FR.latePenalties,
      recoveryIndemnity: DEFAULT_INVOICE_MENTIONS_FR.recoveryIndemnity,
      discount: DEFAULT_INVOICE_MENTIONS_FR.discount,
      vatFranchise: DEFAULT_INVOICE_MENTIONS_FR.vatFranchise,
    });
  });
});

describe("sanitizeInvoiceMentions", () => {
  it("drops empty keys", () => {
    expect(sanitizeInvoiceMentions({ paymentTerms: "  ", discount: "Escompte 2 %" })).toEqual({
      discount: "Escompte 2 %",
    });
    expect(sanitizeInvoiceMentions({})).toBeUndefined();
  });
});
