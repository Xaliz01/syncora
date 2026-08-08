import {
  ASSISTANT_MESSAGE_MAX_LENGTH,
  canAccessAssistantRoute,
  filterAssistantSuggestions,
  getAssistantRouteByHref,
  isAssistantCatalogHref,
  normalizeAssistantHref,
  parseAssistantChatRequest,
  suggestionsFromAccessibleRoutes,
} from "../assistant";
import type { PermissionCode } from "../permissions";

function allow(...codes: PermissionCode[]) {
  const set = new Set(codes);
  return (code: PermissionCode) => set.has(code);
}

describe("assistant", () => {
  describe("normalizeAssistantHref", () => {
    it("normalise un chemin relatif", () => {
      expect(normalizeAssistantHref("/cases/")).toBe("/cases");
      expect(normalizeAssistantHref("/cases?x=1")).toBe("/cases?x=1");
    });

    it("rejette les URLs externes", () => {
      expect(normalizeAssistantHref("https://evil.example/x")).toBeNull();
    });
  });

  describe("parseAssistantChatRequest", () => {
    it("accepte un message valide", () => {
      const parsed = parseAssistantChatRequest({
        message: "  où est le planning ?  ",
        pathname: "/cases",
        conversationId: "c1",
      });
      expect(parsed).toEqual({
        ok: true,
        value: {
          message: "où est le planning ?",
          pathname: "/cases",
          conversationId: "c1",
        },
      });
    });

    it("refuse un message vide", () => {
      expect(parseAssistantChatRequest({ message: "   " })).toEqual({
        ok: false,
        error: "message ne peut pas être vide",
      });
    });

    it("refuse un message trop long", () => {
      const parsed = parseAssistantChatRequest({
        message: "x".repeat(ASSISTANT_MESSAGE_MAX_LENGTH + 1),
      });
      expect(parsed.ok).toBe(false);
    });
  });

  describe("catalogue & permissions", () => {
    it("reconnaît les href whitelist", () => {
      expect(isAssistantCatalogHref("/cases/calendar")).toBe(true);
      expect(isAssistantCatalogHref("/cases/unknown")).toBe(false);
    });

    it("autorise les routes sans permission", () => {
      const route = getAssistantRouteByHref("/");
      expect(route).toBeDefined();
      expect(canAccessAssistantRoute(route!, () => false)).toBe(true);
    });

    it("exige au moins une permission pour Intégrations", () => {
      const route = getAssistantRouteByHref("/settings/integrations");
      expect(route).toBeDefined();
      expect(canAccessAssistantRoute(route!, allow("cases.read"))).toBe(false);
      expect(canAccessAssistantRoute(route!, allow("integrations.qonto.read"))).toBe(true);
    });
  });

  describe("filterAssistantSuggestions", () => {
    it("drop les href hors whitelist ou sans permission", () => {
      const filtered = filterAssistantSuggestions(
        [
          { label: "Planning", href: "/cases/calendar" },
          { label: "Hack", href: "https://evil.example" },
          { label: "Clients", href: "/customers" },
          { label: "Inventé", href: "/not-a-real-page" },
        ],
        allow("cases.read"),
      );
      expect(filtered).toEqual([{ label: "Planning", href: "/cases/calendar" }]);
    });

    it("déduplique et plafonne", () => {
      const filtered = filterAssistantSuggestions(
        [
          { label: "A", href: "/cases" },
          { label: "B", href: "/cases/" },
          { label: "C", href: "/cases/new" },
          { label: "D", href: "/cases/calendar" },
          { label: "E", href: "/my-day" },
          { label: "F", href: "/customers" },
          { label: "G", href: "/billing" },
        ],
        () => true,
      );
      expect(filtered).toHaveLength(5);
      expect(filtered[0]?.href).toBe("/cases");
    });
  });

  describe("suggestionsFromAccessibleRoutes", () => {
    it("priorise les href demandés si accessibles", () => {
      const suggestions = suggestionsFromAccessibleRoutes(allow("cases.read", "customers.read"), [
        "/customers",
        "/cases/calendar",
      ]);
      expect(suggestions[0]?.href).toBe("/customers");
      expect(suggestions[1]?.href).toBe("/cases/calendar");
    });
  });
});
