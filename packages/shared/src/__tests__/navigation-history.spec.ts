import {
  applyNavigationVisit,
  isIgnoredNavigationPath,
  MAX_NAVIGATION_HISTORY,
  navigationHistoryStorageKey,
  parseNavigationHistory,
  type NavigationHistoryEntry,
} from "../navigation-history";

describe("navigation-history", () => {
  describe("navigationHistoryStorageKey", () => {
    it("scopes by user and organization", () => {
      expect(navigationHistoryStorageKey("u1", "org-a")).toBe("planwise:nav-history:u1:org-a");
      expect(navigationHistoryStorageKey("u1", "org-a")).not.toBe(
        navigationHistoryStorageKey("u1", "org-b"),
      );
    });
  });

  describe("isIgnoredNavigationPath", () => {
    it("ignores auth and platform paths", () => {
      expect(isIgnoredNavigationPath("/login")).toBe(true);
      expect(isIgnoredNavigationPath("/register")).toBe(true);
      expect(isIgnoredNavigationPath("/platform/users")).toBe(true);
      expect(isIgnoredNavigationPath("/~offline")).toBe(true);
      expect(isIgnoredNavigationPath("/cases")).toBe(false);
      expect(isIgnoredNavigationPath("/")).toBe(false);
    });
  });

  describe("applyNavigationVisit", () => {
    it("puts newest visit first and bumps revisits", () => {
      const first = applyNavigationVisit([], {
        href: "/cases",
        label: "Dossiers",
        visitedAt: "2026-01-01T10:00:00.000Z",
      });
      const second = applyNavigationVisit(first, {
        href: "/customers",
        label: "Clients",
        visitedAt: "2026-01-01T11:00:00.000Z",
      });
      expect(second.map((e) => e.href)).toEqual(["/customers", "/cases"]);

      const bumped = applyNavigationVisit(second, {
        href: "/cases",
        label: "Tous les dossiers",
        visitedAt: "2026-01-01T12:00:00.000Z",
      });
      expect(bumped.map((e) => e.href)).toEqual(["/cases", "/customers"]);
      expect(bumped[0]?.label).toBe("Tous les dossiers");
      expect(bumped[0]?.visitedAt).toBe("2026-01-01T12:00:00.000Z");
    });

    it("caps at MAX_NAVIGATION_HISTORY", () => {
      let list: NavigationHistoryEntry[] = [];
      for (let i = 0; i < MAX_NAVIGATION_HISTORY + 10; i++) {
        list = applyNavigationVisit(list, {
          href: `/p/${i}`,
          label: `P${i}`,
          visitedAt: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
        });
      }
      expect(list).toHaveLength(MAX_NAVIGATION_HISTORY);
      expect(list[0]?.href).toBe(`/p/${MAX_NAVIGATION_HISTORY + 9}`);
    });
  });

  describe("parseNavigationHistory", () => {
    it("filters invalid rows and sorts DESC", () => {
      expect(
        parseNavigationHistory([
          { href: "/b", label: "B", visitedAt: "2026-01-02T00:00:00.000Z" },
          { href: "/a", label: "A", visitedAt: "2026-01-03T00:00:00.000Z" },
          { href: "/bad", label: "X", visitedAt: "not-a-date" },
          null,
        ]).map((e) => e.href),
      ).toEqual(["/a", "/b"]);
    });
  });
});
