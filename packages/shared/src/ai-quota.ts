/**
 * Quotas IA copilote — compteur par organisation.
 * Le guide in-app (assistant) ne consomme pas ces quotas.
 *
 * L'essai est un plafond total (période `trial`), pas un mois calendaire.
 * Essentiel et Copilote sont des compteurs mensuels `YYYY-MM`.
 */

export const AI_USAGE_KEYS = [
  "copilot_voice",
  "field_report",
  "org_read_question",
  "assisted_quote",
  "message_draft",
] as const;
export type AiUsageKey = (typeof AI_USAGE_KEYS)[number];

export type AiQuotaTier = "trial" | "essential" | "copilot";

export interface AiQuotaLimits {
  /** Total max pendant l'essai (15 jours), pas un reset mensuel. */
  trial: number;
  /** Par mois, palier Essentiel payé. */
  essential: number;
  /** Par mois, addon copilote ou plan Pro. */
  copilot: number;
}

export const AI_QUOTA_LIMITS: Record<AiUsageKey, AiQuotaLimits> = {
  /** Dictaphone : une interprétation = une unité (compte-rendu A1 inclus). */
  copilot_voice: { trial: 20, essential: 15, copilot: 120 },
  field_report: { trial: 20, essential: 15, copilot: 120 },
  org_read_question: { trial: 25, essential: 30, copilot: 200 },
  assisted_quote: { trial: 8, essential: 5, copilot: 40 },
  message_draft: { trial: 8, essential: 0, copilot: 40 },
};

export const AI_USAGE_LABELS: Record<AiUsageKey, string> = {
  copilot_voice: "Instructions vocales",
  field_report: "Comptes-rendus d'intervention",
  org_read_question: "Questions à l'assistant",
  assisted_quote: "Devis assistés",
  message_draft: "Brouillons de message",
};

export const COPILOT_VOICE_USAGE = "copilot_voice" satisfies AiUsageKey;

export function getAiQuotaLimit(usage: AiUsageKey, tier: AiQuotaTier): number {
  return AI_QUOTA_LIMITS[usage][tier];
}

export function isValidAiUsageKey(key: string): key is AiUsageKey {
  return (AI_USAGE_KEYS as readonly string[]).includes(key);
}

export interface AiQuotaStatusResponse {
  usage: AiUsageKey;
  tier: AiQuotaTier;
  used: number;
  limit: number;
  remaining: number;
}

export function resolveAiQuotaTier(subscription: {
  status: string;
  hasAccess: boolean;
  activeAddons: readonly string[];
}): AiQuotaTier | null {
  if (!subscription.hasAccess) return null;
  if (subscription.status === "trialing") return "trial";
  if (subscription.activeAddons.includes("ai_copilot")) return "copilot";
  return "essential";
}

export function aiQuotaPeriod(tier: AiQuotaTier, now = new Date()): string {
  if (tier === "trial") return "trial";
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function copilotQuotaExceededMessage(tier: AiQuotaTier, limit: number): string {
  if (tier === "trial") {
    return `Pendant l'essai, vous avez utilisé vos ${limit} instructions vocales. Après l'essai, l'option Copilote permet de continuer au quotidien.`;
  }
  if (tier === "essential") {
    return `Vous avez utilisé vos ${limit} instructions vocales de ce mois-ci. L'option Copilote permet de continuer au quotidien.`;
  }
  return `Vous avez utilisé vos ${limit} instructions vocales de ce mois-ci. Le compteur sera renouvelé le mois prochain.`;
}

export function copilotQuotaRemainingLabel(tier: AiQuotaTier, remaining: number): string {
  const noun = remaining > 1 ? "instructions" : "instruction";
  if (tier === "trial") {
    return `Pendant l'essai, il vous reste ${remaining} ${noun}.`;
  }
  return `Il vous reste ${remaining} ${noun} ce mois-ci.`;
}
