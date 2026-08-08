/**
 * Rend lisibles les étapes numérotées renvoyées par le LLM
 * (souvent collées sur une seule ligne : « 1) … 2) … 3) … »).
 */
export function formatAssistantReplySteps(reply: string): string {
  let text = reply.trim();
  if (!text) return text;

  // Intro suivie immédiatement de « 1) » / « 1. »
  text = text.replace(/([:：])\s*(1[.)]\s+)/u, "$1\n\n$2");
  text = text.replace(/([.!?…])\s+(1[.)]\s+\S)/u, "$1\n\n$2");

  // Couper avant chaque étape 2–20 encore sur la même ligne
  text = text.replace(/([^\n])\s+(\d{1,2})[.)]\s+/gu, (full, before: string, num: string) => {
    const n = Number(num);
    if (n >= 2 && n <= 20) {
      return `${before}\n${n}. `;
    }
    return full;
  });

  // Uniformiser « 1) » → « 1. » en début de ligne
  text = text.replace(/(^|\n)\s*(\d{1,2})\)\s+/gm, "$1$2. ");

  // Éviter trop de lignes vides
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}
