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
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-brand-600 dark:hover:text-brand-400"
      aria-label={helpdeskReady ? "Centre d'aide" : "Support en ligne"}
      title={helpdeskReady ? "Centre d'aide" : "Ouvrir le chat support"}
    >
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
        />
      </svg>
    </button>
  );
}
