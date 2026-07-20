"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { StockMovementResponse } from "@planwise/shared";

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  in: "Entrée",
  out: "Sortie",
  adjustment: "Ajustement",
  transfer: "Transfert",
};

const REASON_LABELS: Record<string, string> = {
  intervention_usage: "Usage intervention",
};

function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function formatMovementSummary(movement: StockMovementResponse): string {
  if (movement.movementType === "transfer") {
    return `${movement.locationName ?? "?"} → ${movement.destinationLocationName ?? "?"}`;
  }
  const stockChange = `${movement.previousStock} → ${movement.newStock}`;
  if (movement.locationName) {
    return `${stockChange} · ${movement.locationName}`;
  }
  return stockChange;
}

function formatReasonLabel(reason: string): string {
  return REASON_LABELS[reason] ?? reason;
}

function MovementMeta({ movement }: { movement: StockMovementResponse }) {
  const parts: ReactNode[] = [];

  if (movement.note) {
    parts.push(<span key="note">{movement.note}</span>);
  }

  if (movement.reason && movement.reason !== "manual") {
    const label = formatReasonLabel(movement.reason);
    if (movement.reason === "intervention_usage" && movement.caseId) {
      parts.push(
        <Link
          key="reason"
          href={`/cases/${movement.caseId}`}
          className="text-brand-600 dark:text-brand-400 hover:underline"
        >
          {label}
        </Link>,
      );
    } else {
      parts.push(<span key="reason">{label}</span>);
    }
  }

  if (movement.actorUserName) {
    parts.push(<span key="actor">par {movement.actorUserName}</span>);
  }

  if (parts.length === 0) return null;

  return (
    <p className="mt-0.5 flex flex-wrap items-center gap-x-1 text-xs text-slate-400 dark:text-slate-500">
      {parts.map((part, index) => (
        <span key={index} className="inline-flex items-center gap-x-1">
          {index > 0 ? <span aria-hidden>·</span> : null}
          {part}
        </span>
      ))}
    </p>
  );
}

export function StockMovementsHistory({
  movements,
  isLoading,
  emptyMessage = "Aucun mouvement pour le moment.",
  showArticleName = false,
  articleHref,
}: {
  movements: StockMovementResponse[];
  isLoading?: boolean;
  emptyMessage?: string;
  showArticleName?: boolean;
  /** Si fourni, le nom d’article devient un lien (ex. `/settings/stock/articles/:id`). */
  articleHref?: (articleId: string) => string;
}) {
  if (isLoading) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">Chargement de l’historique…</p>
    );
  }

  if (movements.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{emptyMessage}</p>;
  }

  return (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
      {movements.map((movement) => (
        <li
          key={movement.id}
          className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 px-4 py-3"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium text-slate-800 dark:text-slate-100">
                {MOVEMENT_TYPE_LABELS[movement.movementType] ?? movement.movementType}
              </span>
              <span className="text-slate-600 dark:text-slate-300">× {movement.quantity}</span>
              {showArticleName &&
                (articleHref ? (
                  <Link
                    href={articleHref(movement.articleId)}
                    className="text-brand-600 dark:text-brand-400 hover:underline truncate"
                  >
                    {movement.articleName}
                    {movement.articleReference ? ` (${movement.articleReference})` : ""}
                  </Link>
                ) : (
                  <span className="text-slate-600 dark:text-slate-300 truncate">
                    {movement.articleName}
                    {movement.articleReference ? ` (${movement.articleReference})` : ""}
                  </span>
                ))}
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {formatMovementSummary(movement)}
            </p>
            <MovementMeta movement={movement} />
          </div>
          <time className="shrink-0 text-xs text-slate-400 dark:text-slate-500 tabular-nums">
            {formatDate(movement.createdAt)}
          </time>
        </li>
      ))}
    </ul>
  );
}
