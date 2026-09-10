"use client";

import Link from "next/link";

type Props = {
  variant?: "connect" | "error";
  onRetry?: () => void;
};

/** Ancien bandeau d’intégration — redirige vers la facturation Planwise. */
export function BillingIntegrationConnectBanner({ variant = "connect", onRetry }: Props) {
  if (variant === "error") {
    return (
      <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950 px-5 py-4 text-sm text-amber-900 dark:text-amber-100 flex flex-wrap items-center gap-3 shadow-sm">
        <span>Impossible de charger la facturation.</span>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="underline font-medium hover:no-underline"
          >
            Réessayer
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-brand-300 dark:border-brand-600 bg-white dark:bg-slate-900 px-5 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm ring-1 ring-brand-100 dark:ring-brand-900">
      <div className="space-y-1">
        <p className="text-base font-semibold text-slate-900 dark:text-slate-50">Facturation</p>
        <p className="text-sm text-slate-600 dark:text-slate-300 max-w-xl">
          Créez et suivez vos factures clients dans Planwise, depuis un dossier ou cet écran.
        </p>
      </div>
      <Link
        href="/billing"
        className="inline-flex shrink-0 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-500 transition shadow-sm"
      >
        Ouvrir Facturation
      </Link>
    </div>
  );
}
