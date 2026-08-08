import { buildOfflineAssistantReply, scoreRoutesForQuery } from "../offline-reply";
import type { PermissionCode } from "@planwise/shared";

function allow(...codes: PermissionCode[]) {
  const set = new Set(codes);
  return (code: PermissionCode) => set.has(code) || codes.length === 0;
}

function allowAll() {
  return () => true;
}

describe("offline-reply", () => {
  it("associe « inviter un utilisateur » à /users/new", () => {
    const matches = scoreRoutesForQuery("Indique moi comment inviter un utilisateur", allowAll());
    expect(matches[0]?.href).toBe("/users/new");
  });

  it("produit une réponse lisible avec étapes et suggestions", () => {
    const result = buildOfflineAssistantReply({
      message: "Indique moi comment inviter un utilisateur",
      hasPermission: allow("users.invite", "users.read"),
    });
    expect(result.suggestions[0]?.href).toBe("/users/new");
    expect(result.reply).toContain("Inviter un utilisateur");
    expect(result.reply).toContain("1.");
    expect(result.reply).toContain("\n\n");
    expect(result.reply).not.toContain("Menus principaux Planwise");
  });

  it("respecte les permissions", () => {
    const result = buildOfflineAssistantReply({
      message: "inviter un utilisateur",
      hasPermission: allow("cases.read"),
    });
    expect(result.suggestions.every((s) => s.href !== "/users/new")).toBe(true);
  });

  it("associe le planning", () => {
    const matches = scoreRoutesForQuery("où est le planning ?", allowAll());
    expect(matches[0]?.href).toBe("/cases/calendar");
  });

  it("répond qui a développé Planwise", () => {
    const result = buildOfflineAssistantReply({
      message: "Qui a développé Planwise ?",
      hasPermission: allowAll(),
    });
    expect(result.reply).toContain("Benoist Babin");
    expect(result.escalateToSupport).toBe(false);
  });
});
