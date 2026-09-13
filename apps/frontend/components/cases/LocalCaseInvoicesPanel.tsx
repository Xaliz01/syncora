"use client";

import {
  LOCAL_INVOICE_KIND_LABELS,
  LOCAL_INVOICE_STATUS_LABELS,
  isIssuedInvoiceStatus,
  type LocalInvoiceResponse,
} from "@planwise/shared";
import { InvoiceEmailHistoryList } from "@/components/billing/SendInvoiceDialog";

export function LocalCaseInvoicesPanel({
  invoices,
  canFinalize,
  canSend,
  finalizePendingId,
  paidPendingId,
  creditPendingId,
  onFinalize,
  onMarkPaid,
  onCredit,
  onDownloadPdf,
  onSend,
}: {
  invoices: LocalInvoiceResponse[];
  canFinalize: boolean;
  canSend: boolean;
  finalizePendingId?: string | null;
  paidPendingId?: string | null;
  creditPendingId?: string | null;
  onFinalize: (invoiceId: string) => void;
  onMarkPaid: (invoiceId: string) => void;
  onCredit: (invoiceId: string) => void;
  onDownloadPdf: (invoice: LocalInvoiceResponse) => void;
  onSend: (invoice: LocalInvoiceResponse) => void;
}) {
  if (invoices.length === 0) return null;

  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Factures ({invoices.length})
      </p>
      {invoices.map((invoice) => {
        const kindLabel = LOCAL_INVOICE_KIND_LABELS[invoice.kind];
        const statusLabel = LOCAL_INVOICE_STATUS_LABELS[invoice.status];
        const showFinalize = canFinalize && invoice.status === "draft";
        const showPaid = canFinalize && invoice.status === "finalized";
        const showCredit =
          canFinalize && (invoice.status === "finalized" || invoice.status === "paid");
        const showPdf = invoice.status !== "cancelled";
        const titleParts = [
          kindLabel,
          invoice.kind === "situation" && invoice.situationNumber
            ? `n°${invoice.situationNumber}`
            : null,
          invoice.situationPercent != null ? `avancement ${invoice.situationPercent} %` : null,
        ].filter(Boolean);

        return (
          <div
            key={invoice.id}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                {titleParts.join(" · ")}
              </p>
              <span className="inline-flex rounded-full border border-slate-200 dark:border-slate-600 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                {statusLabel}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {invoice.number ?? invoice.draftNumber ?? "Sans numéro"} · {invoice.amountHt} € HT
            </p>
            <InvoiceEmailHistoryList
              invoice={invoice}
              className="mt-1 space-y-0.5 text-[11px] text-slate-400 dark:text-slate-500"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {showFinalize ? (
                <button
                  type="button"
                  disabled={finalizePendingId === invoice.id}
                  onClick={() => onFinalize(invoice.id)}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
                >
                  {finalizePendingId === invoice.id ? "Validation…" : "Valider"}
                </button>
              ) : null}
              {showPaid ? (
                <button
                  type="button"
                  disabled={paidPendingId === invoice.id}
                  onClick={() => onMarkPaid(invoice.id)}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {paidPendingId === invoice.id ? "Mise à jour…" : "Marquer payée"}
                </button>
              ) : null}
              {showCredit ? (
                <button
                  type="button"
                  disabled={creditPendingId === invoice.id}
                  onClick={() => onCredit(invoice.id)}
                  className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                >
                  {creditPendingId === invoice.id ? "Avoir…" : "Émettre un avoir"}
                </button>
              ) : null}
              {showPdf ? (
                <button
                  type="button"
                  onClick={() => onDownloadPdf(invoice)}
                  className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  PDF
                </button>
              ) : null}
              {canSend && isIssuedInvoiceStatus(invoice.status) ? (
                <button
                  type="button"
                  onClick={() => onSend(invoice)}
                  className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Envoyer
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
