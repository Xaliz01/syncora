"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { normalizeQuickActionHref } from "@planwise/shared";
import { useAuth } from "@/components/auth/AuthContext";
import { useQuickActionPageLabel } from "@/components/dashboard/QuickActionLabelContext";
import { recordNavigationVisit } from "@/lib/navigation-history";

type MenuLink = { href: string; label: string };

function resolveNavigationLabel(
  pathname: string,
  pageLabel: string | null,
  menuLinks: MenuLink[],
): string {
  if (pageLabel?.trim()) return pageLabel.trim();
  const normalized = normalizeQuickActionHref(pathname);
  if (normalized) {
    for (const link of menuLinks) {
      if (normalizeQuickActionHref(link.href) === normalized) return link.label;
    }
  }
  if (typeof document !== "undefined") {
    const h1 = document.querySelector("main h1");
    const text = h1?.textContent?.trim();
    if (text) return text;
  }
  return pathname;
}

/** Enregistre les navigations app authentifiées dans l’historique local (par org). */
export function NavigationHistoryTracker({ menuLinks }: { menuLinks: MenuLink[] }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pageLabel = useQuickActionPageLabel();

  useEffect(() => {
    if (!user?.id || !user.organizationId || !pathname) return;

    const search = searchParams?.toString();
    const href = search ? `${pathname}?${search}` : pathname;
    const normalized = normalizeQuickActionHref(href);
    if (!normalized) return;

    // Laisser le h1 / label de page se monter (fiches détail).
    const timer = window.setTimeout(() => {
      const label = resolveNavigationLabel(pathname, pageLabel, menuLinks);
      recordNavigationVisit({
        userId: user.id,
        organizationId: user.organizationId,
        href: normalized,
        label,
      });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [user?.id, user?.organizationId, pathname, searchParams, pageLabel, menuLinks]);

  return null;
}
