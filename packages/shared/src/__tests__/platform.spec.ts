import {
  isPlatformStaffEmail,
  parsePlatformStaffEmailDomains,
  parsePlatformStaffEmails,
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
