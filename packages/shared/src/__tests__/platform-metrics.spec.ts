import {
  isPlatformMetricsExcludedEmail,
  isPlatformMetricsExcludedEmailDomain,
  platformMetricsAudienceEmailDomainFilter,
  platformMetricsExcludedEmailDomainFieldRegex,
  platformMetricsExcludedEmailDomainRegex,
} from "../platform";

describe("platform metrics excluded emails", () => {
  it("excludes known domains and any address containing benoistbabin / hugobabin", () => {
    expect(isPlatformMetricsExcludedEmail("mail@benoistbabin.fr")).toBe(true);
    expect(isPlatformMetricsExcludedEmail("ops@planwise.fr")).toBe(true);
    expect(isPlatformMetricsExcludedEmail("e2e.signup.1@planwise.test")).toBe(true);
    expect(isPlatformMetricsExcludedEmail("benoistbabin@gmail.com")).toBe(true);
    expect(isPlatformMetricsExcludedEmail("contact.hugobabin@exemple.fr")).toBe(true);
    expect(isPlatformMetricsExcludedEmail("hugo@hugobabin.com")).toBe(true);
    expect(isPlatformMetricsExcludedEmail("client@exemple.fr")).toBe(false);
    expect(isPlatformMetricsExcludedEmail(null)).toBe(false);
  });

  it("excludes emailDomain values for analytics", () => {
    expect(isPlatformMetricsExcludedEmailDomain("benoistbabin.fr")).toBe(true);
    expect(isPlatformMetricsExcludedEmailDomain("planwise.test")).toBe(true);
    expect(isPlatformMetricsExcludedEmailDomain("mail.hugobabin.org")).toBe(true);
    expect(isPlatformMetricsExcludedEmailDomain("exemple.fr")).toBe(false);
  });

  it("builds a full-email regex usable for Mongo $not", () => {
    const re = platformMetricsExcludedEmailDomainRegex();
    expect(re.test("a@benoistbabin.fr")).toBe(true);
    expect(re.test("a@planwise.fr")).toBe(true);
    expect(re.test("e2e@planwise.test")).toBe(true);
    expect(re.test("benoistbabin@gmail.com")).toBe(true);
    expect(re.test("x.hugobabin.y@z.fr")).toBe(true);
    expect(re.test("a@exemple.fr")).toBe(false);
  });

  it("builds an emailDomain-field regex and audience filter", () => {
    const re = platformMetricsExcludedEmailDomainFieldRegex();
    expect(re.test("planwise.fr")).toBe(true);
    expect(re.test("benoistbabin.fr")).toBe(true);
    expect(re.test("foo.hugobabin.bar")).toBe(true);
    expect(re.test("exemple.fr")).toBe(false);
    expect(platformMetricsAudienceEmailDomainFilter()).toEqual({
      emailDomain: { $not: re },
    });
  });
});
