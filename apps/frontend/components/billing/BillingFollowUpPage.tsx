"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LOCAL_INVOICE_KIND_LABELS,
  LOCAL_INVOICE_STATUSES,
  LOCAL_INVOICE_STATUS_LABELS,
  MAX_PAGE_LIMIT,
  isIssuedInvoiceStatus,
  type LocalInvoiceKind,
  type LocalInvoiceResponse,
  type LocalInvoiceStatus,
} from "@planwise/shared";
import * as billingApi from "@/lib/billing.api";
import * as customersApi from "@/lib/customers.api";
import * as orderGiversApi from "@/lib/order-givers.api";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { ElectronicInvoicingNotice } from "@/components/billing/ElectronicInvoicingNotice";
import {
  InvoiceEmailHistoryList,
  lastInvoiceEmailHint,
  SendInvoiceDialog,
} from "@/components/billing/SendInvoiceDialog";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
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

const GRID = "md:grid-cols-[0.9fr_0.9fr_1.2fr_1fr_0.8fr_0.7fr_0.8fr_minmax(8rem,1fr)]";

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
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [invoiceToSend, setInvoiceToSend] = useState<LocalInvoiceResponse | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("");
  const [invoiceKind, setInvoiceKind] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [orderGiverId, setOrderGiverId] = useState("");
  const [offset, setOffset] = useState(0);

  const periodFilters = {
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  };

  const listFilters = {
    ...periodFilters,
    status: status || undefined,
    kind: invoiceKind || undefined,
    customerId: customerId || undefined,
    orderGiverId: orderGiverId || undefined,
  };

  useEffect(() => {
    setOffset(0);
  }, [startDate, endDate, status, invoiceKind, customerId, orderGiverId]);

  const { data: customersData } = useQuery({
    queryKey: ["customers", "billing-filter"],
    queryFn: () => customersApi.listCustomers({ limit: MAX_PAGE_LIMIT }),
    enabled: can("customers.read"),
  });
  const customers = customersData?.customers ?? [];

  const { data: orderGiversData } = useQuery({
    queryKey: ["order-givers", "billing-filter"],
    queryFn: () => orderGiversApi.listOrderGivers({ limit: MAX_PAGE_LIMIT }),
    enabled: can("order_givers.read"),
  });
  const orderGivers = orderGiversData?.orderGivers ?? [];

  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ["billing-stats", startDate, endDate],
    queryFn: () => billingApi.getInvoiceStats(periodFilters),
    staleTime: 30_000,
  });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["billing-invoices", listFilters, offset],
    queryFn: () =>
      billingApi.listInvoices({
        ...listFilters,
        limit: LIST_PAGE_SIZE,
        offset,
      }),
    staleTime: 20_000,
  });

  const rows = data?.invoices ?? [];
  const total = data?.total ?? 0;
  const hasActiveFilters = Boolean(
    startDate || endDate || status || invoiceKind || customerId || orderGiverId,
  );

  const selectClassName =
    "rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200";

  return (
    <ListPageRoot>
      <ListPageHeader
        title="Facturation"
        description="Factures émises dans Planwise : brouillons, numéros, montants et suivi des paiements."
      />

      <ElectronicInvoicingNotice />

      {statsLoading && (
        <div className="text-sm text-slate-500 dark:text-slate-400">
          Chargement des indicateurs…
        </div>
      )}

      {statsError && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950 px-3 py-2 text-sm text-amber-800 dark:text-amber-200 flex flex-wrap items-center gap-2">
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
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={selectClassName}
            aria-label="Statut facture"
          >
            <option value="">Tous statuts</option>
            {LOCAL_INVOICE_STATUSES.map((key) => (
              <option key={key} value={key}>
                {LOCAL_INVOICE_STATUS_LABELS[key]}
              </option>
            ))}
          </select>
          <select
            value={invoiceKind}
            onChange={(e) => setInvoiceKind(e.target.value)}
            className={selectClassName}
            aria-label="Type de facture"
          >
            <option value="">Tous types</option>
            {(Object.keys(LOCAL_INVOICE_KIND_LABELS) as LocalInvoiceKind[]).map((key) => (
              <option key={key} value={key}>
                {LOCAL_INVOICE_KIND_LABELS[key]}
              </option>
            ))}
          </select>
          {customers.length > 0 ? (
            <SearchableSelect
              value={customerId}
              onChange={(next) => {
                setCustomerId(next);
                if (next) setOrderGiverId("");
              }}
              options={customers.map((c) => ({ value: c.id, label: c.displayName }))}
              emptyLabel="Tous les clients"
              placeholder="Rechercher un client…"
              aria-label="Client"
            />
          ) : null}
          {orderGivers.length > 0 ? (
            <select
              value={orderGiverId}
              onChange={(e) => {
                setOrderGiverId(e.target.value);
                if (e.target.value) setCustomerId("");
              }}
              className={selectClassName}
              aria-label="Donneur d'ordre"
            >
              <option value="">Tous les donneurs d&apos;ordre</option>
              {orderGivers.map((og) => (
                <option key={og.id} value={og.id}>
                  {og.displayName}
                </option>
              ))}
            </select>
          ) : null}
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
        <ListEmptyState message="Aucune facture pour le moment. Créez-en une depuis un dossier." />
      ) : rows.length === 0 ? (
        <ListNoResults message="Aucune facture ne correspond à ces filtres." />
      ) : (
        <ListPagination
          total={total}
          limit={LIST_PAGE_SIZE}
          offset={offset}
          onOffsetChange={setOffset}
        >
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
                <span className="sr-only">Actions</span>
              </>
            }
          >
            {rows.map((invoice) => (
              <div
                key={invoice.id}
                className={`grid ${GRID} gap-x-3 gap-y-1 px-4 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0 items-center`}
              >
                <ListCellMuted>{formatDateFr(invoice.invoiceDate)}</ListCellMuted>
                <ListCellDefault>{invoice.number ?? invoice.draftNumber ?? "—"}</ListCellDefault>
                <ListCellPrimary>
                  <Link
                    href={`/cases/${invoice.caseId}`}
                    className="text-brand-600 dark:text-brand-400 hover:underline truncate block"
                  >
                    {invoice.caseTitle ?? invoice.caseId}
                  </Link>
                </ListCellPrimary>
                <ListCellDefault>{invoice.customer.displayName}</ListCellDefault>
                <ListCellMuted>
                  {LOCAL_INVOICE_KIND_LABELS[invoice.kind] ?? invoice.kind}
                </ListCellMuted>
                <ListCellDefault>{formatAmount(invoice.amountHt)}</ListCellDefault>
                <ListCellDefault>
                  <div>
                    {LOCAL_INVOICE_STATUS_LABELS[invoice.status as LocalInvoiceStatus] ??
                      invoice.status}
                    {(invoice.emailSends?.length ?? 0) > 1 ? (
                      <InvoiceEmailHistoryList
                        invoice={invoice}
                        className="mt-0.5 space-y-0.5 text-[11px] text-slate-400 dark:text-slate-500"
                      />
                    ) : lastInvoiceEmailHint(invoice) ? (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                        {lastInvoiceEmailHint(invoice)}
                      </p>
                    ) : null}
                  </div>
                </ListCellDefault>
                <div className="flex flex-wrap gap-1.5">
                  <PermissionGate permission="billing.invoices.read">
                    {invoice.status !== "cancelled" ? (
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                        onClick={() =>
                          void billingApi.downloadInvoicePdf(
                            invoice.id,
                            `${invoice.number ?? invoice.draftNumber ?? "facture"}.pdf`,
                          )
                        }
                      >
                        PDF
                      </button>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600">—</span>
                    )}
                  </PermissionGate>
                  <PermissionGate permission="billing.invoices.send">
                    {isIssuedInvoiceStatus(invoice.status as LocalInvoiceStatus) ? (
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                        onClick={() => setInvoiceToSend(invoice)}
                      >
                        Envoyer
                      </button>
                    ) : null}
                  </PermissionGate>
                </div>
              </div>
            ))}
          </ListTableShell>
        </ListPagination>
      )}

      <SendInvoiceDialog
        invoice={invoiceToSend}
        open={invoiceToSend != null}
        onClose={() => setInvoiceToSend(null)}
        onSent={() => {
          void queryClient.invalidateQueries({ queryKey: ["billing-invoices"] });
          void queryClient.invalidateQueries({ queryKey: ["billing-stats"] });
        }}
      />
    </ListPageRoot>
  );
}
