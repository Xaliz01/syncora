"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  LOCAL_INVOICE_KIND_LABELS,
  LOCAL_INVOICE_STATUS_LABELS,
  type LocalInvoiceKind,
  type LocalInvoiceStatus,
} from "@planwise/shared";
import * as billingApi from "@/lib/billing.api";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { ListPagination, LIST_PAGE_SIZE } from "@/components/ui/list-page";

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
    queryKey: ["billing-invoices", "party", customerId ?? null, orderGiverId ?? null, offset],
    queryFn: () =>
      billingApi.listInvoices({
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
                const status = invoice.status as LocalInvoiceStatus;
                const kind = invoice.kind as LocalInvoiceKind;
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
                          {LOCAL_INVOICE_STATUS_LABELS[status] ?? status}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                        <span>{LOCAL_INVOICE_KIND_LABELS[kind] ?? kind}</span>
                        <span className="tabular-nums">{formatAmount(invoice.amountHt)}</span>
                        {invoice.number ? <span>N° {invoice.number}</span> : null}
                        <span>{formatDate(invoice.invoiceDate)}</span>
                      </div>
                    </div>
                    <Link
                      href={`/cases/${invoice.caseId}`}
                      className="text-xs text-slate-400 dark:text-slate-500"
                    >
                      →
                    </Link>
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

export function PartyLinkedInvoicesSection(props: Props) {
  return (
    <PermissionGate anyOf={["billing.invoices.read", "exports.billing", "exports.reporting"]}>
      <PartyLinkedInvoicesSectionInner {...props} />
    </PermissionGate>
  );
}
