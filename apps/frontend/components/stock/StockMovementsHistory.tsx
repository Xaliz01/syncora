"use client";

import Link from "next/link";
import type { StockMovementResponse } from "@planwise/shared";

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  in: "Entrée",
  out: "Sortie",
  adjustment: "Ajustement",
  transfer: "Transfert",
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
            {(movement.note || movement.reason || movement.actorUserName) && (
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                {[
                  movement.note,
                  movement.reason && movement.reason !== "manual" ? movement.reason : null,
                  movement.actorUserName ? `par ${movement.actorUserName}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
          <time className="shrink-0 text-xs text-slate-400 dark:text-slate-500 tabular-nums">
            {formatDate(movement.createdAt)}
          </time>
        </li>
      ))}
    </ul>
  );
}
