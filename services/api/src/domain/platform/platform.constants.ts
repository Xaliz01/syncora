export const PAPPERS_API_URL = process.env.PAPPERS_API_URL ?? "https://api.pappers.fr/v2";
export const APP_PUBLIC_URL = process.env.APP_PUBLIC_URL ?? "https://planwise.fr";

export const IMPERSONATION_TTL = "45m";
export const IMPERSONATION_TTL_MS = 45 * 60 * 1000;
export const MIN_REASON_LENGTH = 10;

/** Compare dates Pappers (YYYY-MM-DD ou ISO) — plus récent d’abord. */
export function compareProspectCreatedAtDesc(a?: string, b?: string): number {
  const ta = a ? Date.parse(a.includes("T") ? a : `${a}T00:00:00Z`) : 0;
  const tb = b ? Date.parse(b.includes("T") ? b : `${b}T00:00:00Z`) : 0;
  return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
}
