"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import * as casesApi from "@/lib/cases.api";
import type { CasePriority, CaseStatus } from "@planwise/shared";

const STATUS_LABELS: Record<CaseStatus, string> = {
  draft: "Brouillon",
  open: "Ouvert",
  in_progress: "En cours",
  waiting: "En attente",
  completed: "Terminé",
  cancelled: "Annulé",
};

const STATUS_COLORS: Record<CaseStatus, string> = {
  draft: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
  open: "bg-blue-50 text-blue-700",
  in_progress: "bg-amber-50 text-amber-700",
  waiting: "bg-purple-50 text-purple-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-600",
};

const PRIORITY_LABELS: Record<CasePriority, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  urgent: "Urgente",
};

const PRIORITY_COLORS: Record<CasePriority, string> = {
  low: "text-slate-500",
  medium: "text-blue-600",
  high: "text-orange-600",
  urgent: "text-red-600",
};

function formatDate(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { dateStyle: "medium" });
  } catch {
    return iso;
  }
}

export function CustomerCasesSection({ customerId }: { customerId: string }) {
  const { data: cases, isLoading } = useQuery({
    queryKey: ["cases", "customer", customerId],
    queryFn: () => casesApi.listCases({ customerId }),
  });

  const activeCases =
    cases?.filter((c) => c.status !== "completed" && c.status !== "cancelled") ?? [];
  const closedCases =
    cases?.filter((c) => c.status === "completed" || c.status === "cancelled") ?? [];

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm dark:shadow-slate-950/20">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Dossiers liés</h2>
        {cases && cases.length > 0 && (
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {cases.length} dossier{cases.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {isLoading && <div className="text-sm text-slate-500 dark:text-slate-400">Chargement…</div>}

      {!isLoading && (!cases || cases.length === 0) && (
        <p className="text-sm text-slate-500 dark:text-slate-400">Aucun dossier lié à ce client.</p>
      )}

      {!isLoading && activeCases.length > 0 && (
        <div className="space-y-2">
          {activeCases.map((c) => (
            <Link
              key={c.id}
              href={`/cases/${c.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                    {c.title}
                  </span>
                  <span
                    className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[c.status]}`}
                  >
                    {STATUS_LABELS[c.status]}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className={PRIORITY_COLORS[c.priority]}>{PRIORITY_LABELS[c.priority]}</span>
                  {c.dueDate && <span>Échéance : {formatDate(c.dueDate)}</span>}
                  {c.progress > 0 && <span>{c.progress} %</span>}
                </div>
              </div>
              <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">→</span>
            </Link>
          ))}
        </div>
      )}

      {!isLoading && closedCases.length > 0 && (
        <details className={activeCases.length > 0 ? "mt-3" : ""}>
          <summary className="cursor-pointer text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
            {closedCases.length} dossier{closedCases.length > 1 ? "s" : ""} terminé
            {closedCases.length > 1 ? "s" : ""} / annulé{closedCases.length > 1 ? "s" : ""}
          </summary>
          <div className="mt-2 space-y-2">
            {closedCases.map((c) => (
              <Link
                key={c.id}
                href={`/cases/${c.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 dark:border-slate-800 px-3 py-2 transition hover:bg-slate-50 dark:hover:bg-slate-800/50 opacity-75"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-slate-600 dark:text-slate-300 truncate">
                      {c.title}
                    </span>
                    <span
                      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[c.status]}`}
                    >
                      {STATUS_LABELS[c.status]}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">→</span>
              </Link>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
