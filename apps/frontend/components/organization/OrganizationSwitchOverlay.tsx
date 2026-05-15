"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

/**
 * Overlay plein écran pendant le changement d’organisation (JWT + invalidations).
 */
export function OrganizationSwitchOverlay({
  visible,
  organizationName,
}: {
  visible: boolean;
  organizationName?: string | null;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!visible) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [visible]);

  if (!mounted || !visible) return null;

  return createPortal(
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-busy="true"
      aria-label="Changement d'organisation en cours"
      className="fixed inset-0 z-[10050] flex items-center justify-center p-6"
    >
      <div className="animate-org-switch-backdrop absolute inset-0 bg-white/88 dark:bg-slate-950/92 backdrop-blur-md" />
      <div className="animate-org-switch-pop-in relative flex max-w-sm flex-col items-center gap-5 rounded-2xl border border-slate-200/90 bg-white/96 px-10 py-9 text-center shadow-2xl shadow-slate-900/15 dark:border-slate-700/90 dark:bg-slate-900/96 dark:shadow-black/50">
        <div
          className="h-14 w-14 rounded-full border-[3px] border-brand-500 border-t-transparent animate-spin"
          aria-hidden
        />
        <div>
          <p className="text-base font-semibold text-slate-800 dark:text-slate-100">
            Changement d&apos;organisation
          </p>
          {organizationName ? (
            <p className="mt-2 text-sm font-medium text-brand-600 dark:text-brand-400">
              {organizationName}
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Préparation de votre espace…
            </p>
          )}
          <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
            Rechargement des données pour votre organisation…
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
