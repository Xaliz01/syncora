import type { CSSProperties } from "react";

/**
 * Couleur de carte calendrier : couleur équipe paramétrée (`calendarColor`) si présente,
 * sinon palette stable dérivée de `assignedTeamId`.
 */

const LIGHT_PALETTE = [
  "bg-sky-100 text-sky-950 border border-sky-300/90",
  "bg-violet-100 text-violet-950 border border-violet-300/90",
  "bg-emerald-100 text-emerald-950 border border-emerald-300/90",
  "bg-amber-100 text-amber-950 border border-amber-300/90",
  "bg-rose-100 text-rose-950 border border-rose-300/90",
  "bg-orange-100 text-orange-950 border border-orange-300/90",
  "bg-teal-100 text-teal-950 border border-teal-300/90",
  "bg-indigo-100 text-indigo-950 border border-indigo-300/90",
  "bg-fuchsia-100 text-fuchsia-950 border border-fuchsia-300/90",
  "bg-lime-100 text-lime-950 border border-lime-300/90",
] as const;

const DARK_PALETTE = [
  "bg-sky-900 text-sky-100 border border-sky-600",
  "bg-violet-900 text-violet-100 border border-violet-600",
  "bg-emerald-900 text-emerald-100 border border-emerald-600",
  "bg-amber-900 text-amber-100 border border-amber-600",
  "bg-rose-900 text-rose-100 border border-rose-600",
  "bg-orange-900 text-orange-100 border border-orange-600",
  "bg-teal-900 text-teal-100 border border-teal-600",
  "bg-indigo-900 text-indigo-100 border border-indigo-600",
  "bg-fuchsia-900 text-fuchsia-100 border border-fuchsia-600",
  "bg-lime-900 text-lime-100 border border-lime-600",
] as const;

const LIGHT_BASE = { r: 255, g: 255, b: 255 };
const DARK_BASE = { r: 15, g: 23, b: 42 };

const TEXT_ON_LIGHT_BG = "#0f172a";
const TEXT_ON_DARK_BG = "#f8fafc";

/** Luminance max du fond en mode sombre (évite les pastels illisibles). */
const DARK_BG_LUMINANCE_CAP = 0.32;

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

function parseHexRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = normalizeCalendarColorHex(hex);
  if (!normalized) return null;
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

function mixRgb(
  fg: { r: number; g: number; b: number },
  bg: { r: number; g: number; b: number },
  fgWeight: number,
): { r: number; g: number; b: number } {
  const w = Math.min(1, Math.max(0, fgWeight));
  return {
    r: fg.r * w + bg.r * (1 - w),
    g: fg.g * w + bg.g * (1 - w),
    b: fg.b * w + bg.b * (1 - w),
  };
}

function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function rgbCss({ r, g, b }: { r: number; g: number; b: number }): string {
  return `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)})`;
}

function clampDarkBackground(bg: { r: number; g: number; b: number }): {
  r: number;
  g: number;
  b: number;
} {
  let current = bg;
  let lum = relativeLuminance(current);
  let guard = 0;
  while (lum > DARK_BG_LUMINANCE_CAP && guard < 8) {
    current = mixRgb(current, DARK_BASE, 0.45);
    lum = relativeLuminance(current);
    guard += 1;
  }
  return current;
}

/** Fond teinté équipe (même logique que les cartes calendrier). */
export function getTeamCalendarBackgroundRgb(
  hex: string,
  isDark: boolean,
): { r: number; g: number; b: number } {
  const team = parseHexRgb(hex);
  if (!team) {
    return isDark ? { r: 30, g: 41, b: 59 } : { r: 248, g: 250, b: 252 };
  }

  if (isDark) {
    const teamLum = relativeLuminance(team);
    const weight = teamLum > 0.55 ? 0.28 : teamLum > 0.35 ? 0.38 : 0.48;
    return clampDarkBackground(mixRgb(team, DARK_BASE, weight));
  }

  return mixRgb(team, LIGHT_BASE, 0.24);
}

/** Texte contrasté pour un fond teinté équipe. */
export function getTeamCalendarForeground(hex: string, isDark: boolean): string {
  const bg = getTeamCalendarBackgroundRgb(hex, isDark);
  return relativeLuminance(bg) > 0.5 ? TEXT_ON_LIGHT_BG : TEXT_ON_DARK_BG;
}

/** Bordure lisible sur fond sombre. */
function getTeamCalendarBorderColor(hex: string, isDark: boolean): string {
  const team = parseHexRgb(hex);
  if (!team) return isDark ? "#64748b" : hex;
  if (!isDark) return hex;
  return rgbCss(mixRgb(team, { r: 255, g: 255, b: 255 }, 0.35));
}

/** Classes Tailwind pour le fond / bordure / texte (sans couleur équipe perso). */
export function getTeamCalendarCardClasses(
  teamId: string | undefined | null,
  isDark: boolean,
): string {
  const id = teamId?.trim();
  if (!id) {
    return isDark
      ? "bg-slate-800 text-slate-100 border border-slate-600"
      : "bg-slate-100 text-slate-900 border border-slate-300/90";
  }
  const palette = isDark ? DARK_PALETTE : LIGHT_PALETTE;
  return palette[hashTeamId(id) % palette.length];
}

export interface TeamCalendarCardAppearance {
  className: string;
  style?: CSSProperties;
}

/** Couleur perso équipe (`calendarColor`) ou palette automatique selon `teamId`. */
export function getTeamCalendarCardAppearance(
  teamId: string | undefined | null,
  calendarColor: string | undefined | null,
  isDark: boolean,
): TeamCalendarCardAppearance {
  const hex = normalizeCalendarColorHex(calendarColor);
  if (hex) {
    const bg = getTeamCalendarBackgroundRgb(hex, isDark);
    const fg = getTeamCalendarForeground(hex, isDark);
    return {
      className: "border border-solid",
      style: {
        borderColor: getTeamCalendarBorderColor(hex, isDark),
        backgroundColor: rgbCss(bg),
        color: fg,
      },
    };
  }
  return {
    className: getTeamCalendarCardClasses(teamId, isDark),
    style: undefined,
  };
}

/** Pastille légende (même rendu que les cartes avec couleur perso). */
export function teamLegendSwatchStyle(hex: string, isDark = false): CSSProperties {
  const normalized = normalizeCalendarColorHex(hex) ?? hex;
  const bg = getTeamCalendarBackgroundRgb(normalized, isDark);
  return {
    borderColor: getTeamCalendarBorderColor(normalized, isDark),
    backgroundColor: rgbCss(bg),
  };
}
