import { buildStripeCheckoutLegalParams } from "../stripe-legal-params";

function termsMessage(params: ReturnType<typeof buildStripeCheckoutLegalParams>): string {
  const acceptance = params.custom_text?.terms_of_service_acceptance;
  if (acceptance && typeof acceptance === "object" && "message" in acceptance) {
    return acceptance.message ?? "";
  }
  return "";
}

describe("buildStripeCheckoutLegalParams", () => {
  const originalMarketing = process.env.STRIPE_LEGAL_MARKETING_URL;
  const originalCgv = process.env.STRIPE_CGV_URL;
  const originalCgu = process.env.STRIPE_CGU_URL;

  afterEach(() => {
    if (originalMarketing === undefined) delete process.env.STRIPE_LEGAL_MARKETING_URL;
    else process.env.STRIPE_LEGAL_MARKETING_URL = originalMarketing;
    if (originalCgv === undefined) delete process.env.STRIPE_CGV_URL;
    else process.env.STRIPE_CGV_URL = originalCgv;
    if (originalCgu === undefined) delete process.env.STRIPE_CGU_URL;
    else process.env.STRIPE_CGU_URL = originalCgu;
  });

  it("should require terms acceptance with CGV and CGU links on marketing domain", () => {
    process.env.STRIPE_LEGAL_MARKETING_URL = "https://planwise.fr";

    const params = buildStripeCheckoutLegalParams();

    expect(params.consent_collection).toEqual({ terms_of_service: "required" });
    const message = termsMessage(params);

    expect(message).toContain("https://planwise.fr/cgv");
    expect(message).toContain("https://planwise.fr/cgu");
  });

  it("should allow overriding CGV/CGU URLs", () => {
    process.env.STRIPE_CGV_URL = "https://legal.example.com/cgv";
    process.env.STRIPE_CGU_URL = "https://legal.example.com/cgu";

    const params = buildStripeCheckoutLegalParams();

    const message = termsMessage(params);

    expect(message).toContain("https://legal.example.com/cgv");
    expect(message).toContain("https://legal.example.com/cgu");
  });
});
