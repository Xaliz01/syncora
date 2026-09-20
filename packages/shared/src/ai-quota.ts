/**
 * Quotas IA copilote — compteur mensuel par organisation.
 *
 * Chaque usage (A1 field report, A3 questions, B1 devis…) a un quota
 * par palier (essai / essentiel / copilote). Le guide in-app (assistant
 * actuel) ne consomme pas ces quotas.
 */

export const AI_USAGE_KEYS = [
  "field_report",
  "org_read_question",
  "assisted_quote",
  "message_draft",
] as const;
export type AiUsageKey = (typeof AI_USAGE_KEYS)[number];

export type AiQuotaTier = "trial" | "essential" | "copilot";

export interface AiQuotaLimits {
  /** Total max pendant l'essai (non mensuel — 15 jours). */
  trial: number;
  /** Par mois, palier Essentiel payé. */
  essential: number;
  /** Par mois, addon copilote ou plan Pro. */
  copilot: number;
}

export const AI_QUOTA_LIMITS: Record<AiUsageKey, AiQuotaLimits> = {
  field_report: { trial: 20, essential: 15, copilot: 120 },
  org_read_question: { trial: 25, essential: 30, copilot: 200 },
  assisted_quote: { trial: 8, essential: 5, copilot: 40 },
  message_draft: { trial: 8, essential: 0, copilot: 40 },
};

export const AI_USAGE_LABELS: Record<AiUsageKey, string> = {
  field_report: "Comptes-rendus d'intervention",
  org_read_question: "Questions à l'assistant",
  assisted_quote: "Devis assistés",
  message_draft: "Brouillons de message",
};

export function getAiQuotaLimit(usage: AiUsageKey, tier: AiQuotaTier): number {
  return AI_QUOTA_LIMITS[usage][tier];
}

export function isValidAiUsageKey(key: string): key is AiUsageKey {
  return (AI_USAGE_KEYS as readonly string[]).includes(key);
}

// ── AI Quota API types ──

export interface AiQuotaStatusResponse {
  usage: AiUsageKey;
  tier: AiQuotaTier;
  used: number;
  limit: number;
  remaining: number;
}

// ── Field Report types ──

export interface GenerateFieldReportBody {
  interventionId: string;
}

export interface GenerateFieldReportResponse {
  draft: string;
  quotaRemaining: number;
}

export interface ConfirmFieldReportBody {
  interventionId: string;
  report: string;
}

export interface ConfirmFieldReportResponse {
  interventionId: string;
  fieldReport: string;
  confirmedAt: string;
}

export interface InterventionFieldReport {
  report: string;
  confirmedAt: string;
  generatedByAi: boolean;
}
