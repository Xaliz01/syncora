"use client";

import React from "react";
import { useAddon } from "@/lib/hooks/useAddon";
import { ADDON_PRICES } from "@syncora/shared";
import {
  InterventionTeamOptimizer,
  type InterventionTeamOptimizerProps,
} from "@/components/cases/InterventionTeamOptimizer";

interface TeamSuggestionAddonGateProps extends InterventionTeamOptimizerProps {
  /** Si true, désactive l'auto-sélection de la meilleure équipe (utile en édition). */
  disableAutoSelect?: boolean;
}

function LockedTeaser({
  canManageBilling,
  onStartCheckout,
  isPending,
}: {
  canManageBilling: boolean;
  onStartCheckout: () => void;
  isPending: boolean;
}) {
  return (
    <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-gradient-to-b from-slate-50/90 to-white dark:from-slate-900 dark:to-slate-950 p-3 shadow-sm overflow-hidden">
      <div className="absolute inset-0 backdrop-blur-[2px] bg-white/40 dark:bg-slate-950/40 z-10 pointer-events-none" />

      <div className="flex items-start gap-2 mb-2 opacity-60">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white shadow-md shadow-brand-900/20"
          aria-hidden
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 13L9 7"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
            Suggestion intelligente d'équipe
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Comparez automatiquement les distances, temps de trajet, consommation
            et CO₂ de chaque équipe pour choisir la meilleure.
          </p>
        </div>
      </div>

      <div className="space-y-2 opacity-50 pointer-events-none select-none" aria-hidden>
        {[1, 2].map((i) => (
          <div
            key={i}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/50 px-3 py-2.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  {i === 1 && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-600/60 text-white text-[10px] font-semibold px-2 py-0.5">
                      Meilleur choix
                    </span>
                  )}
                  <div className="h-3.5 bg-slate-200 dark:bg-slate-700 rounded w-24" />
                </div>
                <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded w-32 mt-1.5" />
              </div>
              <div className="text-right">
                <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-12" />
              </div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  className="rounded-md bg-white/60 dark:bg-slate-950/30 px-2 py-1 border border-slate-200/80 dark:border-slate-700/80"
                >
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-12 mb-1" />
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-10" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="relative z-20 mt-3 rounded-xl border border-brand-200 dark:border-brand-800 bg-gradient-to-br from-brand-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30 p-4">
        <div className="flex items-center gap-2 mb-2">
          <svg
            className="h-5 w-5 text-brand-600 dark:text-brand-400 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Module addon — {ADDON_PRICES.team_suggestion}
          </h4>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
          Optimisez vos tournées en assignant automatiquement l'équipe la plus
          proche. Estimez la distance, le temps de trajet, la consommation de
          carburant et l'empreinte CO₂ pour chaque intervention.
        </p>
        {canManageBilling ? (
          <button
            type="button"
            onClick={onStartCheckout}
            disabled={isPending}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition"
          >
            {isPending ? "Redirection…" : "Obtenir le module de suggestion"}
          </button>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Contactez un administrateur de votre organisation pour activer cet addon.
          </p>
        )}
      </div>
    </div>
  );
}

export function TeamSuggestionAddonGate({
  disableAutoSelect,
  ...optimizerProps
}: TeamSuggestionAddonGateProps) {
  const { hasAddon, isLoading, canManageBilling, startCheckout, isCheckoutPending } =
    useAddon("team_suggestion");

  if (isLoading) {
    return null;
  }

  if (!hasAddon) {
    return (
      <LockedTeaser
        canManageBilling={canManageBilling}
        onStartCheckout={startCheckout}
        isPending={isCheckoutPending}
      />
    );
  }

  return <InterventionTeamOptimizer {...optimizerProps} />;
}
