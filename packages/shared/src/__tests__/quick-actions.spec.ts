import {
  DEFAULT_QUICK_ACTION_IDS,
  normalizeQuickActionIds,
  resolveQuickActions,
  isQuickActionId,
} from "../quick-actions";

describe("quick-actions", () => {
  describe("isQuickActionId", () => {
    it("accepts known ids", () => {
      expect(isQuickActionId("case_new")).toBe(true);
      expect(isQuickActionId("my_day")).toBe(true);
    });

    it("rejects unknown values", () => {
      expect(isQuickActionId("unknown")).toBe(false);
      expect(isQuickActionId(null)).toBe(false);
      expect(isQuickActionId(1)).toBe(false);
    });
  });

  describe("normalizeQuickActionIds", () => {
    it("returns null for too few ids", () => {
      expect(normalizeQuickActionIds(["case_new"])).toBeNull();
    });

    it("dedupes and keeps order", () => {
      expect(normalizeQuickActionIds(["my_day", "calendar", "my_day", "customers"])).toEqual([
        "my_day",
        "calendar",
        "customers",
      ]);
    });

    it("caps at max and skips unknowns", () => {
      const result = normalizeQuickActionIds([
        "case_new",
        "bogus",
        "cases_list",
        "calendar",
        "case_templates",
        "my_day",
        "customers",
        "customer_new",
        "stock",
      ]);
      expect(result).toEqual([
        "case_new",
        "cases_list",
        "calendar",
        "case_templates",
        "my_day",
        "customers",
      ]);
    });
  });

  describe("resolveQuickActions", () => {
    it("uses defaults when selection empty", () => {
      const resolved = resolveQuickActions([], () => true);
      expect(resolved.map((a) => a.id)).toEqual([...DEFAULT_QUICK_ACTION_IDS]);
    });

    it("filters by permission and preserves order", () => {
      const resolved = resolveQuickActions(
        ["my_day", "case_new", "stock"],
        (code) => code === "interventions.read" || code === "cases.create",
      );
      expect(resolved.map((a) => a.id)).toEqual(["my_day", "case_new"]);
      expect(resolved[0]?.href).toBe("/my-day");
    });

    it("skips unknown ids", () => {
      const resolved = resolveQuickActions(
        ["case_new", "not_real" as never, "calendar"],
        () => true,
      );
      expect(resolved.map((a) => a.id)).toEqual(["case_new", "calendar"]);
    });
  });
});
