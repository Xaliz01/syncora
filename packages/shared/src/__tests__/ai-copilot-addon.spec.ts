import {
  ADDON_CODES,
  ADDON_CATALOG,
  TRIAL_INCLUDED_ADDON_CODES,
  isTrialIncludedAddon,
  organizationHasAddon,
  type OrganizationSubscriptionResponse,
} from "../subscription";

describe("ai_copilot addon", () => {
  it("is registered in ADDON_CODES", () => {
    expect(ADDON_CODES).toContain("ai_copilot");
  });

  it("has a catalog descriptor", () => {
    const descriptor = ADDON_CATALOG.ai_copilot;
    expect(descriptor).toBeDefined();
    expect(descriptor.code).toBe("ai_copilot");
    expect(descriptor.billingModel).toBe("boolean");
    expect(descriptor.requiresBaseSubscription).toBe(true);
    expect(descriptor.monthlyPriceCents).toBe(799);
  });

  it("is included in trial", () => {
    expect(TRIAL_INCLUDED_ADDON_CODES).toContain("ai_copilot");
    expect(isTrialIncludedAddon("ai_copilot")).toBe(true);
  });

  it("organizationHasAddon returns true for trialing org", () => {
    const sub = {
      status: "trialing",
      hasAccess: true,
      activeAddons: [],
    } as Pick<OrganizationSubscriptionResponse, "status" | "hasAccess"> & {
      activeAddons: readonly string[];
    };
    expect(organizationHasAddon(sub as never, "ai_copilot")).toBe(true);
  });

  it("organizationHasAddon returns false for active org without addon", () => {
    const sub = {
      status: "active",
      hasAccess: true,
      activeAddons: [],
    } as Pick<OrganizationSubscriptionResponse, "status" | "hasAccess"> & {
      activeAddons: readonly string[];
    };
    expect(organizationHasAddon(sub as never, "ai_copilot")).toBe(false);
  });

  it("organizationHasAddon returns true for active org with addon purchased", () => {
    const sub = {
      status: "active",
      hasAccess: true,
      activeAddons: ["ai_copilot"],
    } as Pick<OrganizationSubscriptionResponse, "status" | "hasAccess"> & {
      activeAddons: readonly string[];
    };
    expect(organizationHasAddon(sub as never, "ai_copilot")).toBe(true);
  });
});
