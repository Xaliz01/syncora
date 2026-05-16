"use client";

import React from "react";
import type { AddonCode } from "@syncora/shared";
import { ADDON_CATALOG } from "@syncora/shared";
import { useAddon } from "@/lib/hooks/useAddon";

interface AddonLockedOverlayProps {
  addonCode: AddonCode;
  /**
   * Contenu affiché en aperçu flou derrière l'overlay quand l'addon n'est pas actif.
   * Généralement un skeleton / placeholder représentatif du module verrouillé.
   */
  preview: React.ReactNode;
  /** Contenu complet affiché quand l'addon est actif. */
  children: React.ReactNode;
}

/**
 * Gate générique pour tout addon payant.
 *
 * - Addon actif → rend `children` tel quel.
 * - Addon inactif → rend un aperçu flou (`preview`) superposé d'un CTA d'achat.
 * - Loading → rend null.
 *
 * Pour ajouter un nouvel addon verrouillé, il suffit d'utiliser ce composant
 * avec le code addon correspondant + un preview et children spécifiques.
 */
export function AddonLockedOverlay({ addonCode, preview, children }: AddonLockedOverlayProps) {
  const { hasAddon, isLoading, canManageBilling, openSubscriptionModify } = useAddon(addonCode);

  if (isLoading) return null;
  if (hasAddon) return <>{children}</>;

  const descriptor = ADDON_CATALOG[addonCode];

  return (
    <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-gradient-to-b from-slate-50/90 to-white dark:from-slate-900 dark:to-slate-950 p-3 shadow-sm overflow-hidden">
      {/* Couche floue au-dessus de l'aperçu */}
      <div className="absolute inset-0 backdrop-blur-[2px] bg-white/40 dark:bg-slate-950/40 z-10 pointer-events-none" />

      {/* Aperçu du module (flou) */}
      <div className="opacity-50 pointer-events-none select-none" aria-hidden>
        {preview}
      </div>

      {/* CTA d'achat */}
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
            {descriptor.label} — {descriptor.priceLabel}
          </h4>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
          {descriptor.pitch}
        </p>
        {canManageBilling ? (
          <>
            <button
              type="button"
              onClick={openSubscriptionModify}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 transition"
            >
              {`Obtenir « ${descriptor.label} »`}
            </button>
          </>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Contactez un administrateur de votre organisation pour activer cet addon.
          </p>
        )}
      </div>
    </div>
  );
}
