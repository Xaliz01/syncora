import {
  isPlatformMetricsExcludedEmail,
  platformMetricsExcludedEmailDomainRegex,
} from "../platform";

describe("platform metrics excluded emails", () => {
  it("excludes benoistbabin.fr, planwise.fr and planwise.test", () => {
    expect(isPlatformMetricsExcludedEmail("mail@benoistbabin.fr")).toBe(true);
    expect(isPlatformMetricsExcludedEmail("ops@planwise.fr")).toBe(true);
    expect(isPlatformMetricsExcludedEmail("e2e.signup.1@planwise.test")).toBe(true);
    expect(isPlatformMetricsExcludedEmail("client@exemple.fr")).toBe(false);
    expect(isPlatformMetricsExcludedEmail(null)).toBe(false);
  });

  it("builds a domain regex usable for Mongo $not", () => {
    const re = platformMetricsExcludedEmailDomainRegex();
    expect(re.test("a@benoistbabin.fr")).toBe(true);
    expect(re.test("a@planwise.fr")).toBe(true);
    expect(re.test("e2e@planwise.test")).toBe(true);
    expect(re.test("a@exemple.fr")).toBe(false);
  });
});
