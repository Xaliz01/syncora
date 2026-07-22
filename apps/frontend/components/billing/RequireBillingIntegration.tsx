"use client";

import Link from "next/link";
import { useBillingIntegrationAvailability } from "@/lib/hooks/useBillingIntegrationAvailability";

/**
 * N’affiche le contenu que si une intégration facturation (Pennylane ou Qonto) est connectée.
 * Sinon : message + lien vers Paramètres → Intégrations.
 */
export function RequireBillingIntegration({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError, refetch } = useBillingIntegrationAvailability();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 text-sm text-slate-500">
        Vérification de la connexion facturation…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-6 text-sm text-amber-800 dark:text-amber-200 space-y-3">
        <p>Impossible de vérifier les intégrations de facturation.</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="underline font-medium hover:no-underline"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (!data?.connected) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 max-w-lg space-y-3">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Facturation</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Connectez Pennylane ou Qonto pour suivre et exporter vos factures synchronisées.
        </p>
        <Link
          href="/settings/integrations"
          className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 transition"
        >
          Ouvrir les intégrations
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
