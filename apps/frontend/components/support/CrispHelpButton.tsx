"use client";

import {
  isCrispEnabled,
  isCrispHelpdeskEnabled,
  openCrispChat,
  openCrispHelpdesk,
} from "@/lib/crisp-client";

export function CrispHelpButton() {
  if (!isCrispEnabled()) {
    return null;
  }

  const helpdeskReady = isCrispHelpdeskEnabled();

  return (
    <button
      type="button"
      onClick={() => {
        if (helpdeskReady) {
          openCrispHelpdesk();
          return;
        }
        openCrispChat();
      }}
      className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 transition hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
      aria-label={helpdeskReady ? "Centre d'aide" : "Support en ligne"}
      title={helpdeskReady ? "Centre d'aide" : "Ouvrir le chat support"}
    >
      <span>Aide</span>
      {!helpdeskReady && (
        <span className="font-normal text-slate-400 dark:text-slate-500">chat</span>
      )}
    </button>
  );
}
