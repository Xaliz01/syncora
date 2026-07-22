"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  CaseInvoiceKind,
  CaseInvoiceSyncStatus,
  QuoteSummaryResponse,
  SyncCaseInvoiceOptions,
} from "@planwise/shared";
import {
  CASE_INVOICE_KIND_LABELS,
  CASE_INVOICE_KINDS,
  quoteInvoicedHt,
  remainingQuoteHt,
  remainingQuotePercent,
} from "@planwise/shared";

type Props = {
  open: boolean;
  pending?: boolean;
  providerLabel: "Pennylane" | "Qonto";
  quotes: QuoteSummaryResponse[];
  /** Factures déjà liées (pour calculer le reste du devis). */
  invoices?: CaseInvoiceSyncStatus[];
  /** Pré-sélectionne ce devis à l’ouverture (ex. depuis la carte devis). */
  initialQuoteId?: string | null;
  onClose: () => void;
  onSubmit: (options: SyncCaseInvoiceOptions) => void;
};

export function CreateCaseInvoiceDialog({
  open,
  pending,
  providerLabel,
  quotes,
  invoices = [],
  initialQuoteId,
  onClose,
  onSubmit,
}: Props) {
  const preferredQuoteId = useMemo(() => {
    if (initialQuoteId && quotes.some((q) => q.id === initialQuoteId)) {
      return initialQuoteId;
    }
    const accepted = quotes.find((q) => q.status === "accepted");
    return accepted?.id ?? quotes[0]?.id ?? "";
  }, [quotes, initialQuoteId]);

  const [quoteId, setQuoteId] = useState(preferredQuoteId);
  const [invoiceKind, setInvoiceKind] = useState<CaseInvoiceKind>("full");
  const [situationPercent, setSituationPercent] = useState("30");
  const [amountHt, setAmountHt] = useState("");
  const [mode, setMode] = useState<"percent" | "amount">("percent");

  useEffect(() => {
    if (open) {
      setQuoteId(preferredQuoteId);
      setInvoiceKind("full");
      setSituationPercent("30");
      setAmountHt("");
      setMode("percent");
    }
  }, [open, preferredQuoteId]);

  if (!open) return null;

  const selectedQuote = quotes.find((q) => q.id === quoteId);
  const hasQuotes = quotes.length > 0;
  const alreadyInvoicedHt = quoteId ? quoteInvoicedHt(invoices, quoteId) : 0;
  const remainingHt = selectedQuote
    ? remainingQuoteHt(selectedQuote.totalHt, alreadyInvoicedHt)
    : 0;
  const remainingPct = selectedQuote
    ? remainingQuotePercent(selectedQuote.totalHt, remainingHt)
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteId) return;
    const options: SyncCaseInvoiceOptions = {
      quoteId,
      invoiceKind,
    };
    if (invoiceKind === "situation") {
      if (mode === "percent") {
        const pct = Number.parseFloat(situationPercent.replace(",", "."));
        if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return;
        options.situationPercent = pct;
      } else {
        const amt = Number.parseFloat(amountHt.replace(",", "."));
        if (!Number.isFinite(amt) || amt <= 0) return;
        options.amountHt = amt;
      }
    }
    if (invoiceKind === "deposit") {
      const amt = Number.parseFloat(amountHt.replace(",", "."));
      if (!Number.isFinite(amt) || amt <= 0) return;
      options.amountHt = amt;
    }
    onSubmit(options);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-5 space-y-4"
        role="dialog"
        aria-labelledby="create-invoice-title"
      >
        <div>
          <h2
            id="create-invoice-title"
            className="text-base font-semibold text-slate-900 dark:text-slate-100"
          >
            Créer une facture {providerLabel}
          </h2>
        </div>

        {!hasQuotes ? (
          <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-3 py-3 text-sm text-amber-900 dark:text-amber-100">
            Aucun devis sur ce dossier. Créez un devis avec des lignes, puis revenez créer la
            facture.
          </div>
        ) : (
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Devis</span>
            <select
              value={quoteId}
              onChange={(e) => setQuoteId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
              required
            >
              {quotes.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.quoteNumber}
                  {q.subject ? ` — ${q.subject}` : ""} ({q.totalHt.toFixed(2)} € HT)
                </option>
              ))}
            </select>
            {selectedQuote ? (
              <span className="text-xs text-slate-500 dark:text-slate-400 block">
                Total devis : {selectedQuote.totalHt.toFixed(2)} € HT
                {alreadyInvoicedHt > 0
                  ? ` · déjà facturé / brouillon : ${alreadyInvoicedHt.toFixed(2)} € HT`
                  : ""}
                {" · "}
                reste : {remainingHt.toFixed(2)} € HT ({remainingPct} %)
              </span>
            ) : null}
          </label>
        )}

        {hasQuotes ? (
          <>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Type
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {CASE_INVOICE_KINDS.map((kind) => (
                  <label
                    key={kind}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${
                      invoiceKind === kind
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-950/40"
                        : "border-slate-200 dark:border-slate-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="invoiceKind"
                      value={kind}
                      checked={invoiceKind === kind}
                      onChange={() => setInvoiceKind(kind)}
                      className="accent-brand-600"
                    />
                    {CASE_INVOICE_KIND_LABELS[kind]}
                  </label>
                ))}
              </div>
            </fieldset>

            {invoiceKind === "situation" ? (
              <div className="space-y-3">
                <div className="flex gap-2 text-sm">
                  <button
                    type="button"
                    onClick={() => setMode("percent")}
                    className={`rounded-lg px-3 py-1.5 border ${
                      mode === "percent"
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-950/40"
                        : "border-slate-200 dark:border-slate-600"
                    }`}
                  >
                    Pourcentage
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("amount")}
                    className={`rounded-lg px-3 py-1.5 border ${
                      mode === "amount"
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-950/40"
                        : "border-slate-200 dark:border-slate-600"
                    }`}
                  >
                    Montant HT
                  </button>
                </div>
                {mode === "percent" ? (
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Avancement (%)
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      step={0.01}
                      value={situationPercent}
                      onChange={(e) => setSituationPercent(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                      required
                    />
                  </label>
                ) : (
                  <label className="block space-y-1.5">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Montant HT (€)
                    </span>
                    <input
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={amountHt}
                      onChange={(e) => setAmountHt(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                      required
                    />
                  </label>
                )}
              </div>
            ) : null}

            {invoiceKind === "deposit" ? (
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Montant d’acompte HT (€)
                </span>
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={amountHt}
                  onChange={(e) => setAmountHt(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 px-3 py-2 text-sm"
                  required
                />
              </label>
            ) : null}

            {invoiceKind === "balance" ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Le solde facturera le reste HT du devis non encore couvert par les factures liées.
              </p>
            ) : null}
          </>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 disabled:opacity-50"
          >
            {hasQuotes ? "Annuler" : "Fermer"}
          </button>
          {hasQuotes ? (
            <button
              type="submit"
              disabled={pending || !quoteId}
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {pending ? "Création…" : `Envoyer vers ${providerLabel}`}
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
