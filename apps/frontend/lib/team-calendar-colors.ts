import type { CSSProperties } from "react";

/**
 * Couleur de carte calendrier : couleur équipe paramétrée (`calendarColor`) si présente,
 * sinon palette stable dérivée de `assignedTeamId`.
 */

const PALETTE = [
  "bg-sky-100 text-sky-950 border border-sky-300/90 dark:bg-sky-950/55 dark:text-sky-50 dark:border-sky-700",
  "bg-violet-100 text-violet-950 border border-violet-300/90 dark:bg-violet-950/55 dark:text-violet-50 dark:border-violet-700",
  "bg-emerald-100 text-emerald-950 border border-emerald-300/90 dark:bg-emerald-950/55 dark:text-emerald-50 dark:border-emerald-700",
  "bg-amber-100 text-amber-950 border border-amber-300/90 dark:bg-amber-950/55 dark:text-amber-50 dark:border-amber-700",
  "bg-rose-100 text-rose-950 border border-rose-300/90 dark:bg-rose-950/55 dark:text-rose-50 dark:border-rose-700",
  "bg-orange-100 text-orange-950 border border-orange-300/90 dark:bg-orange-950/55 dark:text-orange-50 dark:border-orange-700",
  "bg-teal-100 text-teal-950 border border-teal-300/90 dark:bg-teal-950/55 dark:text-teal-50 dark:border-teal-700",
  "bg-indigo-100 text-indigo-950 border border-indigo-300/90 dark:bg-indigo-950/55 dark:text-indigo-50 dark:border-indigo-700",
  "bg-fuchsia-100 text-fuchsia-950 border border-fuchsia-300/90 dark:bg-fuchsia-950/55 dark:text-fuchsia-50 dark:border-fuchsia-700",
  "bg-lime-100 text-lime-950 border border-lime-300/90 dark:bg-lime-950/55 dark:text-lime-50 dark:border-lime-700"
] as const;

function hashTeamId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Normalise une entrée utilisateur / API vers `#RRGGBB` ou `null`. */
export function normalizeCalendarColorHex(input: string | undefined | null): string | null {
  if (input == null || typeof input !== "string") return null;
  const t = input.trim();
  if (!t) return null;
  const short = /^#?([0-9a-fA-F]{3})$/.exec(t);
  if (short) {
    const [r, g, b] = short[1].split("").map((c) => c + c);
    return `#${r}${g}${b}`.toUpperCase();
  }
  const full = /^#?([0-9a-fA-F]{6})$/.exec(t);
  if (full) return `#${full[1]}`.toUpperCase();
  return null;
}

/** Classes Tailwind pour le fond / bordure / texte (sans couleur équipe perso). */
export function getTeamCalendarCardClasses(teamId: string | undefined | null): string {
  const id = teamId?.trim();
  if (!id) {
    return "bg-slate-100 text-slate-900 border border-slate-300/90 dark:bg-slate-800/90 dark:text-slate-100 dark:border-slate-600";
  }
  return PALETTE[hashTeamId(id) % PALETTE.length];
}

export interface TeamCalendarCardAppearance {
  className: string;
  style?: CSSProperties;
}

/** Couleur perso équipe (`calendarColor`) ou palette automatique selon `teamId`. */
export function getTeamCalendarCardAppearance(
  teamId: string | undefined | null,
  calendarColor: string | undefined | null
): TeamCalendarCardAppearance {
  const hex = normalizeCalendarColorHex(calendarColor);
  if (hex) {
    return {
      className: "team-cal-custom",
      style: { "--team-cal-border": hex } as CSSProperties
    };
  }
  return {
    className: getTeamCalendarCardClasses(teamId),
    style: undefined
  };
}

/** Pastille légende (même rendu que les cartes avec couleur perso). */
export function teamLegendSwatchStyle(hex: string): CSSProperties {
  return { "--team-cal-border": normalizeCalendarColorHex(hex) ?? hex } as CSSProperties;
}
