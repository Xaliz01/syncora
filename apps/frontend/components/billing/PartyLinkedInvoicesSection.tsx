"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  CASE_INVOICE_KIND_LABELS,
  REMOTE_INVOICE_STATUS_LABELS,
  type CaseInvoiceKind,
  type RemoteInvoiceLifecycle,
} from "@planwise/shared";
import * as integrationsApi from "@/lib/integrations.api";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { ListPagination, LIST_PAGE_SIZE } from "@/components/ui/list-page";

const PROVIDER_LABELS: Record<string, string> = {
  pennylane: "Pennylane",
  qonto: "Qonto",
  demo: "Démo",
};

function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { dateStyle: "medium" });
  } catch {
    return iso;
  }
}

function formatAmount(amount?: string): string {
  if (!amount) return "—";
  const n = Number(amount);
  if (Number.isNaN(n)) return amount;
  return `${n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € HT`;
}

type Props = {
  customerId?: string;
  orderGiverId?: string;
  emptyMessage: string;
};

function PartyLinkedInvoicesSectionInner({ customerId, orderGiverId, emptyMessage }: Props) {
  const [offset, setOffset] = useState(0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["invoice-syncs", "party", customerId ?? null, orderGiverId ?? null, offset],
    queryFn: () =>
      integrationsApi.listOrganizationInvoiceSyncs({
        customerId,
        orderGiverId,
        limit: LIST_PAGE_SIZE,
        offset,
      }),
    enabled: Boolean(customerId || orderGiverId),
  });

  const invoices = data?.invoices ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm dark:shadow-slate-950/20">
      <div className="flex items-center justify-between mb-3 gap-2">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Suivi de la facturation
        </h2>
        <div className="flex items-center gap-3">
          {total > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {total} facture{total > 1 ? "s" : ""}
            </span>
          )}
          <Link
            href="/billing"
            className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            Voir tout
          </Link>
        </div>
      </div>

      {isLoading && <div className="text-sm text-slate-500 dark:text-slate-400">Chargement…</div>}

      {isError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Impossible de charger les factures liées.
        </p>
      )}

      {!isLoading && !isError && (
        <ListPagination
          offset={offset}
          limit={LIST_PAGE_SIZE}
          total={total}
          onOffsetChange={setOffset}
        >
          {total === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">{emptyMessage}</p>
          )}

          {invoices.length > 0 && (
            <div className="space-y-2">
              {invoices.map((invoice) => {
                const status = (invoice.remoteStatus ??
                  (invoice.draft ? "draft" : "finalized")) as RemoteInvoiceLifecycle;
                const kind = (invoice.invoiceKind ?? "full") as CaseInvoiceKind;
                return (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/cases/${invoice.caseId}`}
                          className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate hover:underline"
                        >
                          {invoice.caseTitle ?? "Dossier"}
                        </Link>
                        <span className="inline-flex shrink-0 rounded-full border border-slate-200 dark:border-slate-600 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                          {REMOTE_INVOICE_STATUS_LABELS[status] ?? status}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                        <span>{PROVIDER_LABELS[invoice.provider] ?? invoice.provider}</span>
                        <span>{CASE_INVOICE_KIND_LABELS[kind] ?? kind}</span>
                        <span className="tabular-nums">{formatAmount(invoice.amountHt)}</span>
                        {invoice.invoiceNumber ? <span>N° {invoice.invoiceNumber}</span> : null}
                        <span>{formatDate(invoice.createdAt ?? invoice.lastSyncedAt)}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {invoice.invoiceUrl ? (
                        <a
                          href={invoice.invoiceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
                        >
                          Ouvrir
                        </a>
                      ) : null}
                      <Link
                        href={`/cases/${invoice.caseId}`}
                        className="text-xs text-slate-400 dark:text-slate-500"
                      >
                        →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ListPagination>
      )}
    </div>
  );
}

/** Card factures liées — visible si l’utilisateur a accès au suivi facturation. */
export function PartyLinkedInvoicesSection(props: Props) {
  return (
    <PermissionGate anyOf={["exports.billing", "exports.reporting"]}>
      <PartyLinkedInvoicesSectionInner {...props} />
    </PermissionGate>
  );
}
