"use client";

import React from "react";
import { AddonLockedOverlay } from "@/components/addon/AddonLockedOverlay";
import {
  InterventionTeamOptimizer,
  type InterventionTeamOptimizerProps,
} from "@/components/cases/InterventionTeamOptimizer";

/**
 * Aperçu skeleton du module de suggestion d'équipe.
 * Affiché en version floue quand l'addon n'est pas actif.
 */
function TeamSuggestionPreview() {
  return (
    <>
      <div className="flex items-start gap-2 mb-2">
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

      <div className="space-y-2">
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
    </>
  );
}

/**
 * Gate spécifique à l'addon « team_suggestion ».
 *
 * Utilise le composant générique AddonLockedOverlay :
 * - addon actif  → affiche InterventionTeamOptimizer
 * - addon absent → affiche un teaser visuel spécifique + CTA d'achat
 */
export function TeamSuggestionAddonGate(optimizerProps: InterventionTeamOptimizerProps) {
  return (
    <AddonLockedOverlay
      addonCode="team_suggestion"
      preview={<TeamSuggestionPreview />}
    >
      <InterventionTeamOptimizer {...optimizerProps} />
    </AddonLockedOverlay>
  );
}
