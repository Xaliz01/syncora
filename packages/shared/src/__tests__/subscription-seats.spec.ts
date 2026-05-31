import {
  BASE_SUBSCRIPTION_INCLUDED_USERS,
  computeMaxOrganizationUsers,
  estimateMonthlySubscriptionCents,
  sanitizeAddonQuantities,
} from "../subscription";

describe("subscription seats", () => {
  it("should include 2 users in the base plan", () => {
    expect(BASE_SUBSCRIPTION_INCLUDED_USERS).toBe(2);
    expect(computeMaxOrganizationUsers({})).toBe(2);
  });

  it("should add extra_users quantity to max users", () => {
    expect(computeMaxOrganizationUsers({ extra_users: 3 })).toBe(5);
  });

  it("should sanitize negative or non-finite quantities", () => {
    expect(sanitizeAddonQuantities({ extra_users: -2.7 })).toEqual({
      extra_users: 0,
      extra_storage: 0,
    });
    expect(sanitizeAddonQuantities({ extra_users: 2.9 })).toEqual({
      extra_users: 2,
      extra_storage: 0,
    });
  });

  it("should estimate monthly total from base plan and addons", () => {
    expect(
      estimateMonthlySubscriptionCents({
        activeAddons: ["team_suggestion"],
        addonQuantities: { extra_users: 2 },
      }),
    ).toBe(999 + 499 + 299 * 2);
  });
});
