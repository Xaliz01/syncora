import { formatAssistantReplySteps } from "../format-reply";

describe("formatAssistantReplySteps", () => {
  it("découpe les étapes collées sur une seule ligne", () => {
    const input =
      "Pour désactiver les notifications, voici les étapes : 1) Allez dans Paramètres → Notifications. 2) Décochez les canaux. 3) C’est enregistré.";
    const out = formatAssistantReplySteps(input);
    expect(out).toContain("\n1. ");
    expect(out).toContain("\n2. ");
    expect(out).toContain("\n3. ");
    expect(out).not.toMatch(/1\) Allez.*2\)/);
  });

  it("laisse intacte une réponse déjà bien formatée", () => {
    const input = "Voici comment faire :\n\n1. Ouvrir Notifications.\n2. Décochez les canaux.";
    expect(formatAssistantReplySteps(input)).toBe(input);
  });

  it("normalise 1) en 1. en début de ligne", () => {
    const out = formatAssistantReplySteps("Intro.\n\n1) Première\n2) Deuxième");
    expect(out).toContain("1. Première");
    expect(out).toContain("2. Deuxième");
  });
});
