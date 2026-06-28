"use client";

import { usePwaInstall } from "@/lib/use-pwa-install";

export function PwaInstallBanner() {
  const { canShow, install, dismiss } = usePwaInstall();

  if (!canShow) return null;

  return (
    <div
      role="banner"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900 sm:left-auto sm:right-6 sm:bottom-6"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-lg font-semibold text-white">
          S
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
            Installer Planwise
          </p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Accédez rapidement à vos interventions depuis l&apos;écran d&apos;accueil, même hors
            connexion.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={install}
              className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-brand-500"
            >
              Installer
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            >
              Plus tard
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Fermer"
          className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
