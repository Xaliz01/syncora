"use client";

import { isCrispEnabled, isCrispHelpdeskEnabled, openCrispHelpdesk } from "@/lib/crisp-client";

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
        }
      }}
      disabled={!helpdeskReady}
      className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 transition disabled:cursor-default disabled:opacity-80 hover:enabled:bg-slate-50 dark:hover:enabled:bg-slate-800 hover:enabled:text-slate-700 dark:hover:enabled:text-slate-200"
      aria-label={helpdeskReady ? "Centre d'aide" : "Centre d'aide (à venir)"}
      title={
        helpdeskReady
          ? "Centre d'aide"
          : "Centre d'aide Crisp — activez le plugin Helpdesk dans Crisp, puis NEXT_PUBLIC_CRISP_HELPDESK_ENABLED=true"
      }
    >
      <span>Aide</span>
      {!helpdeskReady && (
        <span className="font-normal text-slate-400 dark:text-slate-500">à venir</span>
      )}
    </button>
  );
}
