import {
  applyNavigationVisit,
  isIgnoredNavigationPath,
  navigationHistoryStorageKey,
  parseNavigationHistory,
  type NavigationHistoryEntry,
} from "@planwise/shared";
import { normalizeQuickActionHref } from "@planwise/shared";

export const NAVIGATION_HISTORY_CHANGED_EVENT = "planwise:navigation-history-changed";

export type { NavigationHistoryEntry };

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function notifyChanged(userId: string, organizationId: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(NAVIGATION_HISTORY_CHANGED_EVENT, {
      detail: { userId, organizationId },
    }),
  );
}

export function readNavigationHistory(
  userId: string,
  organizationId: string,
): NavigationHistoryEntry[] {
  if (!canUseStorage() || !userId.trim() || !organizationId.trim()) return [];
  try {
    const raw = window.localStorage.getItem(navigationHistoryStorageKey(userId, organizationId));
    if (!raw) return [];
    return parseNavigationHistory(JSON.parse(raw) as unknown);
  } catch {
    return [];
  }
}

export function writeNavigationHistory(
  userId: string,
  organizationId: string,
  entries: readonly NavigationHistoryEntry[],
): void {
  if (!canUseStorage() || !userId.trim() || !organizationId.trim()) return;
  try {
    window.localStorage.setItem(
      navigationHistoryStorageKey(userId, organizationId),
      JSON.stringify(parseNavigationHistory(entries)),
    );
    notifyChanged(userId, organizationId);
  } catch {
    /* quota / private mode — ignorer */
  }
}

export function recordNavigationVisit(options: {
  userId: string;
  organizationId: string;
  href: string;
  label: string;
  visitedAt?: string;
}): NavigationHistoryEntry[] {
  const href = normalizeQuickActionHref(options.href);
  if (!href || isIgnoredNavigationPath(href)) {
    return readNavigationHistory(options.userId, options.organizationId);
  }

  const existing = readNavigationHistory(options.userId, options.organizationId);
  const next = applyNavigationVisit(existing, {
    href,
    label: options.label,
    visitedAt: options.visitedAt,
  });
  writeNavigationHistory(options.userId, options.organizationId, next);
  return next;
}

export function formatNavigationVisitedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
