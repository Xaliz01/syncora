"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  CASE_INVOICE_KIND_LABELS,
  REMOTE_INVOICE_STATUS_LABELS,
  type CaseInvoiceKind,
  type RemoteInvoiceLifecycle,
} from "@planwise/shared";
import * as integrationsApi from "@/lib/integrations.api";
import * as exportsApi from "@/lib/exports.api";
import { useToast } from "@/components/ui/ToastProvider";
import { ExportButton } from "@/components/ui/ExportButton";
import { PermissionGate } from "@/components/auth/PermissionGate";
import {
  ListCellDefault,
  ListCellMuted,
  ListCellPrimary,
  ListEmptyState,
  ListLoadingState,
  ListNoResults,
  ListPageError,
  ListPageHeader,
  ListPageRoot,
  ListPagination,
  LIST_PAGE_SIZE,
  ListTableShell,
  ListToolbar,
} from "@/components/ui/list-page";

const GRID = "md:grid-cols-[0.9fr_0.9fr_1.2fr_1fr_0.8fr_0.7fr_0.8fr_0.7fr_0.5fr]";

const PROVIDER_LABELS: Record<string, string> = {
  pennylane: "Pennylane",
  qonto: "Qonto",
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</div>
      <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
        {value}
      </div>
      {sub && <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function formatDateFr(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatAmount(amount?: string): string {
  if (!amount) return "—";
  const n = Number(amount);
  if (Number.isNaN(n)) return amount;
  return `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

export function BillingFollowUpPage() {
  const { showToast } = useToast();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [remoteStatus, setRemoteStatus] = useState("");
  const [provider, setProvider] = useState("");
  const [invoiceKind, setInvoiceKind] = useState("");
  const [offset, setOffset] = useState(0);

  const periodFilters = {
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    provider: provider || undefined,
  };

  const listFilters = {
    ...periodFilters,
    remoteStatus: remoteStatus || undefined,
    invoiceKind: invoiceKind || undefined,
  };

  useEffect(() => {
    setOffset(0);
  }, [startDate, endDate, remoteStatus, provider, invoiceKind]);

  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["billing-stats", startDate, endDate, provider],
    queryFn: () => integrationsApi.getOrganizationInvoiceSyncStats(periodFilters),
    staleTime: 30_000,
  });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["billing-invoices", listFilters, offset],
    queryFn: () =>
      integrationsApi.listOrganizationInvoiceSyncs({
        ...listFilters,
        limit: LIST_PAGE_SIZE,
        offset,
      }),
    staleTime: 20_000,
  });

  const rows = data?.invoices ?? [];
  const total = data?.total ?? 0;
  const hasActiveFilters = Boolean(startDate || endDate || remoteStatus || provider || invoiceKind);

  const runExport = async (format: "pdf" | "xlsx" | "csv") => {
    try {
      await exportsApi.exportInvoicesList(format, listFilters);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erreur lors de la génération de l'export";
      showToast(message, "error");
      throw err;
    }
  };

  const selectClassName =
    "rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200";

  return (
    <ListPageRoot>
      <ListPageHeader
        title="Facturation"
        description="Suivi des factures synchronisées depuis Pennylane ou Qonto."
        action={
          <PermissionGate permission="exports.billing">
            <ExportButton formats={["xlsx", "csv", "pdf"]} onExport={runExport} label="Exporter" />
          </PermissionGate>
        }
      />

      {statsLoading && (
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Chargement des indicateurs…
        </div>
      )}

      {statsError && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-sm text-amber-800 dark:text-amber-200 flex flex-wrap items-center gap-2">
          <span>Impossible de charger les indicateurs.</span>
          <button
            type="button"
            onClick={() => void refetchStats()}
            className="underline font-medium hover:no-underline"
          >
            Réessayer
          </button>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Factures" value={stats.total} />
          <StatCard
            label="Brouillons"
            value={stats.draftCount}
            sub={formatAmount(stats.amountHtDraft)}
          />
          <StatCard
            label="Finalisées"
            value={stats.finalizedCount}
            sub={formatAmount(stats.amountHtFinalized)}
          />
          <StatCard label="Payées" value={stats.paidCount} sub={formatAmount(stats.amountHtPaid)} />
          <StatCard label="Annulées" value={stats.cancelledCount} />
          <StatCard label="Montant HT actif" value={formatAmount(stats.amountHtTotal)} />
        </div>
      )}

      <ListToolbar>
        <div className="flex flex-wrap gap-2 items-center w-full">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Période :</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={selectClassName}
          />
          <span className="text-xs text-slate-400">→</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={selectClassName}
          />
          <select
            value={remoteStatus}
            onChange={(e) => setRemoteStatus(e.target.value)}
            className={selectClassName}
            aria-label="Statut facture"
          >
            <option value="">Tous statuts</option>
            {(Object.keys(REMOTE_INVOICE_STATUS_LABELS) as RemoteInvoiceLifecycle[]).map((key) => (
              <option key={key} value={key}>
                {REMOTE_INVOICE_STATUS_LABELS[key]}
              </option>
            ))}
          </select>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className={selectClassName}
            aria-label="Fournisseur"
          >
            <option value="">Tous fournisseurs</option>
            <option value="pennylane">Pennylane</option>
            <option value="qonto">Qonto</option>
          </select>
          <select
            value={invoiceKind}
            onChange={(e) => setInvoiceKind(e.target.value)}
            className={selectClassName}
            aria-label="Type de facture"
          >
            <option value="">Tous types</option>
            {(Object.keys(CASE_INVOICE_KIND_LABELS) as CaseInvoiceKind[]).map((key) => (
              <option key={key} value={key}>
                {CASE_INVOICE_KIND_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
      </ListToolbar>

      {isError ? (
        <ListPageError
          error={error}
          fallbackMessage="Impossible de charger les factures."
          onRetry={() => void refetch()}
        />
      ) : null}

      {isLoading ? (
        <ListLoadingState />
      ) : total === 0 && !hasActiveFilters ? (
        <ListEmptyState message="Aucune facture synchronisée pour le moment." />
      ) : rows.length === 0 ? (
        <ListNoResults message="Aucune facture ne correspond à ces filtres." />
      ) : (
        <>
          <ListTableShell
            gridTemplateClass={GRID}
            headerCells={
              <>
                <span>Date</span>
                <span>Numéro</span>
                <span>Dossier</span>
                <span>Client</span>
                <span>Type</span>
                <span>Montant HT</span>
                <span>Statut</span>
                <span>Fournisseur</span>
                <span className="sr-only">Lien</span>
              </>
            }
          >
            {rows.map((invoice) => (
              <div
                key={invoice.id}
                className={`grid ${GRID} gap-x-3 gap-y-1 px-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0 items-center`}
              >
                <ListCellMuted>{formatDateFr(invoice.createdAt)}</ListCellMuted>
                <ListCellDefault>{invoice.invoiceNumber ?? "—"}</ListCellDefault>
                <ListCellPrimary>
                  <Link
                    href={`/cases/${invoice.caseId}`}
                    className="text-brand-600 dark:text-brand-400 hover:underline truncate block"
                  >
                    {invoice.caseTitle ?? invoice.caseId}
                  </Link>
                </ListCellPrimary>
                <ListCellDefault>{invoice.customerDisplayName ?? "—"}</ListCellDefault>
                <ListCellMuted>
                  {CASE_INVOICE_KIND_LABELS[invoice.invoiceKind] ?? invoice.invoiceKind}
                </ListCellMuted>
                <ListCellDefault>{formatAmount(invoice.amountHt)}</ListCellDefault>
                <ListCellDefault>
                  {REMOTE_INVOICE_STATUS_LABELS[invoice.remoteStatus] ?? invoice.remoteStatus}
                </ListCellDefault>
                <ListCellMuted>
                  {PROVIDER_LABELS[invoice.provider] ?? invoice.provider}
                </ListCellMuted>
                <div>
                  {invoice.invoiceUrl ? (
                    <a
                      href={invoice.invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 dark:text-brand-400 hover:underline text-xs"
                      aria-label="Ouvrir la facture"
                    >
                      ↗
                    </a>
                  ) : (
                    <span className="text-slate-300 dark:text-slate-600">—</span>
                  )}
                </div>
              </div>
            ))}
          </ListTableShell>
          <ListPagination
            total={total}
            limit={LIST_PAGE_SIZE}
            offset={offset}
            onOffsetChange={setOffset}
          />
        </>
      )}
    </ListPageRoot>
  );
}
