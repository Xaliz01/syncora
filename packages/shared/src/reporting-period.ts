/** Période obligatoire pour les exports / stats reporting (max 2 ans). */

export const REPORTING_PERIOD_MAX_YEARS = 2;

export class ReportingPeriodError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReportingPeriodError";
  }
}

function parseIsoDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  if (date.toISOString().slice(0, 10) !== value) return null;
  return date;
}

function toLocalIsoDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Période par défaut : le mois glissant se terminant aujourd’hui (calendrier local). */
export function defaultReportingPeriod(now: Date = new Date()): {
  startDate: string;
  endDate: string;
} {
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);
  start.setMonth(start.getMonth() - 1);
  return { startDate: toLocalIsoDateOnly(start), endDate: toLocalIsoDateOnly(end) };
}

/**
 * Valide une période reporting.
 * @returns message d’erreur FR, ou `null` si valide.
 */
export function getReportingPeriodError(
  startDate?: string | null,
  endDate?: string | null,
): string | null {
  const startRaw = startDate?.trim() ?? "";
  const endRaw = endDate?.trim() ?? "";
  if (!startRaw || !endRaw) {
    return "La période (date de début et date de fin) est obligatoire.";
  }
  const start = parseIsoDateOnly(startRaw);
  const end = parseIsoDateOnly(endRaw);
  if (!start || !end) {
    return "Période invalide.";
  }
  if (start > end) {
    return "La date de début doit être antérieure ou égale à la date de fin.";
  }
  const maxEnd = new Date(start);
  maxEnd.setUTCFullYear(maxEnd.getUTCFullYear() + REPORTING_PERIOD_MAX_YEARS);
  if (end > maxEnd) {
    return "La période ne peut pas dépasser 2 ans.";
  }
  return null;
}

/** Parse et valide ; lève `ReportingPeriodError` si invalide. */
export function parseReportingPeriod(
  startDate?: string | null,
  endDate?: string | null,
): { startDate: string; endDate: string } {
  const error = getReportingPeriodError(startDate, endDate);
  if (error) {
    throw new ReportingPeriodError(error);
  }
  return {
    startDate: startDate!.trim(),
    endDate: endDate!.trim(),
  };
}

/** Suffixe de nom de fichier : `_YYYY-MM-DD_YYYY-MM-DD`. */
export function reportingPeriodFilenameSuffix(startDate: string, endDate: string): string {
  return `_${startDate}_${endDate}`;
}
