import { withNotificationOrganizationId } from "../notification";

describe("withNotificationOrganizationId", () => {
  it("appends organizationId as query param", () => {
    expect(withNotificationOrganizationId("/cases/abc", "org-1")).toBe(
      "/cases/abc?organizationId=org-1",
    );
  });

  it("uses & when path already has query params", () => {
    expect(withNotificationOrganizationId("/cases/abc?x=1", "org-1")).toBe(
      "/cases/abc?x=1&organizationId=org-1",
    );
  });

  it("returns path unchanged when organizationId is empty", () => {
    expect(withNotificationOrganizationId("/my-day", "  ")).toBe("/my-day");
  });
});
