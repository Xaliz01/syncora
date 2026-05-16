import {
  OrganizationScopeError,
  assertOrganizationScopedList,
  assertOrganizationScopedPayload,
  requireOrganizationId,
  scopeRequestBody,
  scopeRequestQuery,
} from "../organization-scope";

describe("organization-scope", () => {
  it("requireOrganizationId rejects empty values", () => {
    expect(() => requireOrganizationId("  ")).toThrow(OrganizationScopeError);
  });

  it("scopeRequestBody rejects organizationId mismatch", () => {
    expect(() => scopeRequestBody("org-a", { organizationId: "org-b", name: "Test" })).toThrow(
      OrganizationScopeError,
    );
  });

  it("scopeRequestBody injects organizationId", () => {
    expect(scopeRequestBody("org-a", { name: "Test" })).toEqual({
      name: "Test",
      organizationId: "org-a",
    });
  });

  it("scopeRequestQuery enforces tenant on query params", () => {
    expect(scopeRequestQuery("org-a", { search: "x" })).toEqual({
      search: "x",
      organizationId: "org-a",
    });
    expect(() => scopeRequestQuery("org-a", { organizationId: "org-b" })).toThrow(
      OrganizationScopeError,
    );
  });

  it("assertOrganizationScopedList detects cross-tenant rows", () => {
    expect(() =>
      assertOrganizationScopedList("org-a", [
        { organizationId: "org-a", id: "1" },
        { organizationId: "org-b", id: "2" },
      ]),
    ).toThrow(OrganizationScopeError);
  });

  it("assertOrganizationScopedPayload validates arrays and ignores delete markers", () => {
    expect(() => assertOrganizationScopedPayload("org-a", [{ organizationId: "org-b" }])).toThrow(
      OrganizationScopeError,
    );
    expect(() => assertOrganizationScopedPayload("org-a", { deleted: true })).not.toThrow();
  });
});
