"use client";

import { IntegrationProviderLogo } from "@/components/integrations/IntegrationProviderLogo";
import type { CaseInvoiceSyncStatus } from "@planwise/shared";
import { CASE_INVOICE_KIND_LABELS } from "@planwise/shared";

const REMOTE_STATUS_LABELS: Record<CaseInvoiceSyncStatus["remoteStatus"], string> = {
  draft: "Brouillon",
  finalized: "Validée",
  paid: "Payée",
  cancelled: "Annulée",
  unknown: "Inconnu",
};

const PROVIDER_LABELS = {
  pennylane: "Pennylane",
  qonto: "Qonto",
} as const;

export function CaseInvoiceSyncPanel({
  invoices,
  canSync,
  finalizePendingId,
  refreshPending,
  detachPendingId,
  onFinalize,
  onRefreshOne,
  onRefreshAll,
  onDetach,
}: {
  invoices: CaseInvoiceSyncStatus[];
  canSync: boolean;
  finalizePendingId?: string | null;
  refreshPending?: boolean;
  detachPendingId?: string | null;
  onFinalize: (syncId: string) => void;
  onRefreshOne: (syncId: string) => void;
  onRefreshAll: () => void;
  onDetach?: (syncId: string) => void;
}) {
  if (invoices.length === 0) return null;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Factures liées ({invoices.length})
        </p>
        {canSync ? (
          <button
            type="button"
            disabled={refreshPending}
            onClick={onRefreshAll}
            className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:underline disabled:opacity-50"
          >
            {refreshPending ? "Actualisation…" : "Tout actualiser"}
          </button>
        ) : null}
      </div>

      {invoices.map((sync) => {
        const providerLabel = PROVIDER_LABELS[sync.provider];
        const remoteLabel = REMOTE_STATUS_LABELS[sync.remoteStatus];
        const kindLabel = CASE_INVOICE_KIND_LABELS[sync.invoiceKind];
        const showFinalize = canSync && sync.remoteStatus === "draft";
        const showDetach =
          canSync &&
          onDetach &&
          (sync.remoteStatus === "cancelled" || sync.remoteStatus === "unknown");
        const titleParts = [
          kindLabel,
          sync.invoiceKind === "situation" && sync.situationNumber
            ? `n°${sync.situationNumber}`
            : null,
          sync.situationPercent != null ? `${sync.situationPercent} %` : null,
          sync.amountHt ? `${sync.amountHt} € HT` : null,
          sync.invoiceNumber ? sync.invoiceNumber : null,
        ].filter(Boolean);

        return (
          <div
            key={sync.id}
            className="rounded-lg border border-slate-200/80 dark:border-slate-600 bg-white/70 dark:bg-slate-950/40 px-3 py-3 space-y-3"
          >
            <div className="flex items-start gap-3">
              <IntegrationProviderLogo provider={sync.provider} size={36} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  {providerLabel}
                  {titleParts.length ? ` · ${titleParts.join(" · ")}` : ""}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Statut distant : {remoteLabel}
                  {sync.lastSyncedAt
                    ? ` · maj. ${new Date(sync.lastSyncedAt).toLocaleString("fr-FR")}`
                    : ""}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {sync.invoiceUrl ? (
                <a
                  href={sync.invoiceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Ouvrir dans {providerLabel}
                </a>
              ) : null}
              {canSync ? (
                <button
                  type="button"
                  disabled={refreshPending || finalizePendingId === sync.id}
                  onClick={() => onRefreshOne(sync.id)}
                  className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  Actualiser
                </button>
              ) : null}
              {showFinalize ? (
                <button
                  type="button"
                  disabled={Boolean(finalizePendingId) || refreshPending}
                  onClick={() => onFinalize(sync.id)}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
                >
                  {finalizePendingId === sync.id ? "Validation…" : "Valider"}
                </button>
              ) : null}
              {showDetach ? (
                <button
                  type="button"
                  disabled={Boolean(detachPendingId) || refreshPending}
                  onClick={() => onDetach(sync.id)}
                  className="rounded-lg border border-red-200 dark:border-red-800 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
                >
                  {detachPendingId === sync.id ? "Détachement…" : "Détacher"}
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
