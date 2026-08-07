import {
  normalizeQuickActionHref,
  normalizeQuickActions,
  migrateQuickActionIdsToBookmarks,
  resolveStoredQuickActions,
  resolveQuickActionsForOrganization,
  isOrganizationScopedQuickActionHref,
  quickActionIdFromHref,
  isQuickActionId,
  MAX_QUICK_ACTION_BOOKMARKS,
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

  describe("normalizeQuickActionHref", () => {
    it("normalizes relative paths", () => {
      expect(normalizeQuickActionHref("/cases/")).toBe("/cases");
      expect(normalizeQuickActionHref("/cases?x=1")).toBe("/cases?x=1");
    });

    it("rejects external absolute urls", () => {
      expect(normalizeQuickActionHref("https://evil.example/x")).toBeNull();
    });
  });

  describe("normalizeQuickActions", () => {
    it("accepts empty array", () => {
      expect(normalizeQuickActions([])).toEqual([]);
    });

    it("dedupes by href and fills label", () => {
      expect(
        normalizeQuickActions([
          { href: "/cases", label: "Dossiers" },
          { href: "/cases/", label: "Dup" },
          { href: "/my-day", label: "  " },
        ]),
      ).toEqual([
        { id: quickActionIdFromHref("/cases"), href: "/cases", label: "Dossiers" },
        { id: quickActionIdFromHref("/my-day"), href: "/my-day", label: "/my-day" },
      ]);
    });

    it("caps at max bookmarks", () => {
      const input = Array.from({ length: MAX_QUICK_ACTION_BOOKMARKS + 5 }, (_, i) => ({
        href: `/p/${i}`,
        label: `P${i}`,
      }));
      expect(normalizeQuickActions(input)).toHaveLength(MAX_QUICK_ACTION_BOOKMARKS);
    });

    it("returns null for non-array", () => {
      expect(normalizeQuickActions(null)).toBeNull();
      expect(normalizeQuickActions("x")).toBeNull();
    });
  });

  describe("migrateQuickActionIdsToBookmarks", () => {
    it("maps catalog ids to href bookmarks", () => {
      const result = migrateQuickActionIdsToBookmarks(["my_day", "calendar", "my_day"]);
      expect(result?.map((b) => b.href)).toEqual(["/my-day", "/cases/calendar"]);
      expect(result?.[0]?.label).toBe("Ma journée");
    });

    it("returns null when nothing valid", () => {
      expect(migrateQuickActionIdsToBookmarks(["nope"])).toBeNull();
      expect(migrateQuickActionIdsToBookmarks([])).toBeNull();
    });
  });

  describe("resolveStoredQuickActions", () => {
    it("prefers explicit quickActions including empty", () => {
      expect(resolveStoredQuickActions({ quickActions: [] })).toEqual([]);
      expect(
        resolveStoredQuickActions({
          quickActions: [{ href: "/reporting", label: "Reporting" }],
          quickActionIds: ["case_new", "calendar"],
        }).map((b) => b.href),
      ).toEqual(["/reporting"]);
    });

    it("migrates legacy quickActionIds", () => {
      expect(
        resolveStoredQuickActions({
          quickActionIds: ["my_day", "calendar"],
        }).map((b) => b.href),
      ).toEqual(["/my-day", "/cases/calendar"]);
    });

    it("falls back to empty defaults", () => {
      expect(resolveStoredQuickActions({})).toEqual([]);
    });
  });

  describe("isOrganizationScopedQuickActionHref", () => {
    it("detects case / customer detail paths", () => {
      expect(isOrganizationScopedQuickActionHref("/cases/507f1f77bcf86cd799439011")).toBe(true);
      expect(
        isOrganizationScopedQuickActionHref("/customers/550e8400-e29b-41d4-a716-446655440000"),
      ).toBe(true);
      expect(isOrganizationScopedQuickActionHref("/cases")).toBe(false);
      expect(isOrganizationScopedQuickActionHref("/cases/new")).toBe(false);
      expect(isOrganizationScopedQuickActionHref("/cases/calendar")).toBe(false);
    });
  });

  describe("resolveQuickActionsForOrganization", () => {
    const caseBookmark = {
      href: "/cases/507f1f77bcf86cd799439011",
      label: "Dossier A",
    };
    const catalogBookmark = { href: "/cases", label: "Dossiers" };

    it("uses per-org map when present (including empty)", () => {
      expect(
        resolveQuickActionsForOrganization({
          organizationId: "org-2",
          quickActionsByOrganizationId: {
            "org-1": [caseBookmark],
            "org-2": [],
          },
          quickActions: [caseBookmark, catalogBookmark],
        }),
      ).toEqual([]);
      expect(
        resolveQuickActionsForOrganization({
          organizationId: "org-1",
          quickActionsByOrganizationId: { "org-1": [caseBookmark] },
        }).map((b) => b.href),
      ).toEqual([caseBookmark.href]);
    });

    it("filters entity hrefs from legacy when org has no map entry", () => {
      expect(
        resolveQuickActionsForOrganization({
          organizationId: "org-2",
          quickActions: [caseBookmark, catalogBookmark],
        }).map((b) => b.href),
      ).toEqual(["/cases"]);
    });
  });
});
