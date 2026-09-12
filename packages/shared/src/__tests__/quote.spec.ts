import { canSendQuoteByEmail, defaultQuoteEmailBody, defaultQuoteEmailSubject } from "../quote";

describe("quote email helpers", () => {
  it("allows sending draft, sent and accepted quotes", () => {
    expect(canSendQuoteByEmail("draft")).toBe(true);
    expect(canSendQuoteByEmail("sent")).toBe(true);
    expect(canSendQuoteByEmail("accepted")).toBe(true);
    expect(canSendQuoteByEmail("rejected")).toBe(false);
    expect(canSendQuoteByEmail("cancelled")).toBe(false);
  });

  it("builds a default subject and body", () => {
    expect(defaultQuoteEmailSubject({ quoteNumber: "DEV-2026-0001" })).toBe("Devis DEV-2026-0001");
    expect(
      defaultQuoteEmailBody({ quoteNumber: "DEV-2026-0001", totalHt: 120 }, "Atelier"),
    ).toContain("DEV-2026-0001");
  });
});
