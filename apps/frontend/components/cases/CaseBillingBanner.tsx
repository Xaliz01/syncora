"use client";

import type { ReactNode } from "react";
import type { BillingStatus } from "@planwise/shared";
import { BILLING_STATUS_LABELS, BILLING_STATUSES } from "@planwise/shared";

const BANNER_STYLES: Record<BillingStatus, { shell: string; accent: string; hint: string }> = {
  none: {
    shell: "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/80",
    accent: "text-slate-700 dark:text-slate-200",
    hint: "text-slate-500 dark:text-slate-400",
  },
  to_invoice: {
    shell: "border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40",
    accent: "text-amber-900 dark:text-amber-100",
    hint: "text-amber-800/80 dark:text-amber-200/80",
  },
  invoiced: {
    shell: "border-blue-300 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40",
    accent: "text-blue-900 dark:text-blue-100",
    hint: "text-blue-800/80 dark:text-blue-200/80",
  },
  paid: {
    shell: "border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40",
    accent: "text-emerald-900 dark:text-emerald-100",
    hint: "text-emerald-800/80 dark:text-emerald-200/80",
  },
};

const CHIP_ACTIVE: Record<BillingStatus, string> = {
  none: "bg-slate-700 text-white border-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-200",
  to_invoice:
    "bg-amber-600 text-white border-amber-600 dark:bg-amber-400 dark:text-amber-950 dark:border-amber-400",
  invoiced:
    "bg-blue-600 text-white border-blue-600 dark:bg-blue-400 dark:text-blue-950 dark:border-blue-400",
  paid: "bg-emerald-600 text-white border-emerald-600 dark:bg-emerald-400 dark:text-emerald-950 dark:border-emerald-400",
};

const HINTS: Record<BillingStatus, string> = {
  none: "Ce dossier n’entre pas dans le circuit de facturation.",
  to_invoice: "Prêt à facturer — devis accepté ou travaux terminés.",
  invoiced: "Une facture a été émise (Pennylane ou hors outil).",
  paid: "Paiement reçu pour ce dossier.",
};

export function CaseBillingBanner({
  status,
  canEdit,
  pending,
  onChange,
  pennylaneAction,
}: {
  status: BillingStatus;
  canEdit: boolean;
  pending?: boolean;
  onChange: (status: BillingStatus) => void;
  pennylaneAction?: ReactNode;
}) {
  const styles = BANNER_STYLES[status];

  return (
    <section
      className={`rounded-xl border px-4 py-4 sm:px-5 shadow-sm ${styles.shell}`}
      aria-label="Facturation du dossier"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Facturation
          </p>
          <p className={`mt-1 text-lg font-semibold ${styles.accent}`}>
            {BILLING_STATUS_LABELS[status]}
          </p>
          <p className={`mt-1 text-sm ${styles.hint}`}>{HINTS[status]}</p>
        </div>

        {pennylaneAction ? (
          <div className="shrink-0 flex items-center">{pennylaneAction}</div>
        ) : null}
      </div>

      {canEdit && (
        <div
          className="mt-4 flex flex-wrap gap-2"
          role="group"
          aria-label="Changer le statut de facturation"
        >
          {BILLING_STATUSES.map((value) => {
            const active = value === status;
            return (
              <button
                key={value}
                type="button"
                disabled={pending || active}
                onClick={() => onChange(value)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition disabled:opacity-60 ${
                  active
                    ? CHIP_ACTIVE[value]
                    : "border-slate-200/80 dark:border-slate-600 bg-white/70 dark:bg-slate-950/40 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900"
                }`}
              >
                {BILLING_STATUS_LABELS[value]}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
