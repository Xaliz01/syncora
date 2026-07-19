"use client";

import { useEffect, useRef, useState } from "react";
import { QONTO_INVOICE_NUMBER_REQUIRED_MESSAGE } from "@planwise/shared";

type Props = {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onSubmit: (invoiceNumber: string) => void;
};

export function QontoInvoiceNumberDialog({ open, pending, onClose, onSubmit }: Props) {
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setInvoiceNumber("");
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, pending, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[3px]"
        aria-label="Fermer la boîte de dialogue"
        disabled={pending}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="qonto-invoice-number-title"
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl ring-1 ring-slate-900/5"
      >
        <form
          className="p-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const value = invoiceNumber.trim();
            if (!value) return;
            onSubmit(value);
          }}
        >
          <div>
            <h2
              id="qonto-invoice-number-title"
              className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100"
            >
              Numéro de facture Qonto
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              {QONTO_INVOICE_NUMBER_REQUIRED_MESSAGE}
            </p>
          </div>
          <div>
            <label
              htmlFor="qonto-invoice-number"
              className="block text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              Numéro de facture
            </label>
            <input
              ref={inputRef}
              id="qonto-invoice-number"
              type="text"
              autoComplete="off"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Ex. FAC-2026-001"
              disabled={pending}
              className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 disabled:opacity-50"
            />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={pending}
              onClick={onClose}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={pending || !invoiceNumber.trim()}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {pending ? "Envoi…" : "Envoyer vers Qonto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
