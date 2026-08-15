import {
  isPlatformStaffEmail,
  isPlatformUserActive,
  interpolateEmailTemplatePlaceholders,
  parsePlatformStaffEmailDomains,
  parsePlatformStaffEmails,
  PLATFORM_USER_ACTIVE_WITHIN_MS,
} from "../platform";

describe("platform staff allowlist", () => {
  it("allows exact emails from PLATFORM_STAFF_EMAILS", () => {
    expect(
      isPlatformStaffEmail("mail@benoistbabin.fr", {
        emails: "mail@benoistbabin.fr, other@example.com",
        domains: "",
      }),
    ).toBe(true);
  });

  it("allows emails on configured domains", () => {
    expect(
      isPlatformStaffEmail("support@planwise.fr", {
        emails: "",
        domains: "planwise.fr",
      }),
    ).toBe(true);
  });

  it("rejects non-allowlisted emails", () => {
    expect(
      isPlatformStaffEmail("client@acme.fr", {
        emails: "mail@benoistbabin.fr",
        domains: "planwise.fr",
      }),
    ).toBe(false);
  });

  it("parses emails and domains", () => {
    expect([...parsePlatformStaffEmails(" A@B.fr , c@d.fr ")]).toEqual(["a@b.fr", "c@d.fr"]);
    expect([...parsePlatformStaffEmailDomains("@Planwise.fr, other.io")]).toEqual([
      "planwise.fr",
      "other.io",
    ]);
  });
});

describe("interpolateEmailTemplatePlaceholders", () => {
  it("builds greeting with and without contact name", () => {
    expect(
      interpolateEmailTemplatePlaceholders("{{greeting}}\n{{landingUrl}}", {
        contactName: "Jean",
        landingUrl: "https://planwise.fr/",
      }),
    ).toBe("Bonjour Jean,\nhttps://planwise.fr");
    expect(
      interpolateEmailTemplatePlaceholders("{{greeting}} — {{companyName}}", {
        companyName: "Dupont SARL",
      }),
    ).toBe("Bonjour, — Dupont SARL");
  });
});

describe("isPlatformUserActive", () => {
  const now = Date.parse("2026-08-15T12:00:00.000Z");

  it("is true within the activity window", () => {
    expect(
      isPlatformUserActive(
        new Date(now - PLATFORM_USER_ACTIVE_WITHIN_MS + 1_000).toISOString(),
        now,
      ),
    ).toBe(true);
  });

  it("is false when lastSeen is older than the window", () => {
    expect(
      isPlatformUserActive(
        new Date(now - PLATFORM_USER_ACTIVE_WITHIN_MS - 1_000).toISOString(),
        now,
      ),
    ).toBe(false);
  });

  it("is false without lastSeen", () => {
    expect(isPlatformUserActive(undefined, now)).toBe(false);
  });
});
