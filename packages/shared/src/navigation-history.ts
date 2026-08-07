/** Historique de navigation app (client) — hors analytics page_views. */

export const MAX_NAVIGATION_HISTORY = 50;

export const NAVIGATION_HISTORY_STORAGE_PREFIX = "planwise:nav-history";

export interface NavigationHistoryEntry {
  href: string;
  label: string;
  /** ISO 8601 */
  visitedAt: string;
}

const IGNORED_PATH_PREFIXES = [
  "/login",
  "/register",
  "/verify-email",
  "/invite",
  "/onboarding",
  "/platform",
  "/~offline",
] as const;

export function navigationHistoryStorageKey(userId: string, organizationId: string): string {
  return `${NAVIGATION_HISTORY_STORAGE_PREFIX}:${userId.trim()}:${organizationId.trim()}`;
}

/** Chemins auth / marketing / backoffice à ne pas historiser. */
export function isIgnoredNavigationPath(pathname: string): boolean {
  const path = pathname.trim() || "/";
  const bare = path.split("?")[0]?.split("#")[0] || "/";
  const normalized = bare.length > 1 && bare.endsWith("/") ? bare.slice(0, -1) : bare;
  if (normalized === "/~offline") return true;
  return IGNORED_PATH_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

export function parseNavigationHistory(raw: unknown): NavigationHistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  const result: NavigationHistoryEntry[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const href = typeof row.href === "string" ? row.href.trim() : "";
    if (!href || seen.has(href)) continue;
    const labelRaw = typeof row.label === "string" ? row.label.trim() : "";
    const visitedAt = typeof row.visitedAt === "string" ? row.visitedAt.trim() : "";
    if (!visitedAt || Number.isNaN(Date.parse(visitedAt))) continue;
    seen.add(href);
    result.push({
      href,
      label: (labelRaw || href).slice(0, 120),
      visitedAt,
    });
    if (result.length >= MAX_NAVIGATION_HISTORY) break;
  }
  return result.sort((a, b) => Date.parse(b.visitedAt) - Date.parse(a.visitedAt));
}

/**
 * Ajoute ou remonte une visite en tête (DESC par visitedAt).
 * Dédoublonne par href.
 */
export function applyNavigationVisit(
  existing: readonly NavigationHistoryEntry[],
  visit: { href: string; label: string; visitedAt?: string },
): NavigationHistoryEntry[] {
  const href = visit.href.trim();
  if (!href) return parseNavigationHistory(existing);

  const visitedAt = visit.visitedAt?.trim() || new Date().toISOString();
  const label = (visit.label.trim() || href).slice(0, 120);
  const next: NavigationHistoryEntry[] = [
    { href, label, visitedAt },
    ...existing.filter((e) => e.href !== href),
  ];
  return next.slice(0, MAX_NAVIGATION_HISTORY);
}
