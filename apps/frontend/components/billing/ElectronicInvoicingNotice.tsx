"use client";

import { ELECTRONIC_INVOICING_NOTICE } from "@planwise/shared";

export function ElectronicInvoicingNotice() {
  return (
    <div
      role="note"
      className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 px-4 py-3 shadow-sm"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
        Facturation électronique
      </p>
      <p className="mt-1 text-sm font-medium text-amber-950 dark:text-amber-50">
        {ELECTRONIC_INVOICING_NOTICE}
      </p>
    </div>
  );
}
