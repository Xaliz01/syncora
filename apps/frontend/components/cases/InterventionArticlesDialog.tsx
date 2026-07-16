"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { ArticleResponse, StockLocationResponse, StockLocationType } from "@planwise/shared";
import * as stockApi from "@/lib/stock.api";
import { useToast } from "@/components/ui/ToastProvider";

export type InterventionArticleUsageItem = {
  articleId: string;
  articleName: string;
  articleReference?: string;
  unit: string;
  netQuantity: number;
  consumedQuantity: number;
  returnedQuantity: number;
};

type ArticleLineDraft = {
  key: string;
  articleId: string;
  articleName: string;
  articleReference?: string;
  unit: string;
  quantity: string;
  locationId: string;
};

type UsageAdjustment = {
  articleId: string;
  movementType: "in" | "out";
  quantity: number;
  locationId?: string;
};

const LOCATION_TYPE_LABELS: Record<StockLocationType, string> = {
  warehouse: "Entrepôt",
  agence: "Agence",
  vehicle: "Véhicule",
};

const inputClassName =
  "w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

function buildUsageAdjustments(
  current: InterventionArticleUsageItem[],
  lines: ArticleLineDraft[],
  fallbackLocationId: string,
): UsageAdjustment[] {
  const currentById = new Map(current.map((item) => [item.articleId, item.netQuantity]));
  const targetById = new Map<string, { quantity: number; locationId: string }>();

  for (const line of lines) {
    if (!line.articleId) continue;
    const qty = Number(line.quantity);
    if (!Number.isFinite(qty) || qty < 0) {
      throw new Error(`Quantité invalide pour ${line.articleName || "l'article sélectionné"}`);
    }
    targetById.set(line.articleId, {
      quantity: qty,
      locationId: line.locationId || fallbackLocationId,
    });
  }

  const adjustments: UsageAdjustment[] = [];
  const allIds = new Set([...currentById.keys(), ...targetById.keys()]);

  for (const articleId of allIds) {
    const currentNet = currentById.get(articleId) ?? 0;
    const target = targetById.get(articleId);
    const targetNet = target?.quantity ?? 0;
    const locationId = target?.locationId || fallbackLocationId || undefined;
    const delta = targetNet - currentNet;
    if (delta > 0.000_001) {
      adjustments.push({ articleId, movementType: "out", quantity: delta, locationId });
    } else if (delta < -0.000_001) {
      adjustments.push({ articleId, movementType: "in", quantity: -delta, locationId });
    }
  }

  return adjustments;
}

function linesFromUsage(
  usage: InterventionArticleUsageItem[],
  defaultLocationId: string,
): ArticleLineDraft[] {
  return usage
    .filter((item) => item.netQuantity > 0)
    .map((item) => ({
      key: item.articleId,
      articleId: item.articleId,
      articleName: item.articleName,
      articleReference: item.articleReference,
      unit: item.unit,
      quantity: String(item.netQuantity),
      locationId: defaultLocationId,
    }));
}

function stockAtLocation(article: ArticleResponse | undefined, locationId: string): number | null {
  if (!article) return null;
  const entry = article.locationStocks?.find((ls) => ls.locationId === locationId);
  if (entry) return entry.quantity;
  if ((article.locationStocks?.length ?? 0) > 0) return 0;
  return article.stockQuantity;
}

function formatLocationOption(loc: StockLocationResponse): string {
  const typeLabel = loc.type ? ` · ${LOCATION_TYPE_LABELS[loc.type]}` : "";
  const defaultLabel = loc.isDefault ? " (défaut)" : "";
  return `${loc.name}${typeLabel}${defaultLabel}`;
}

export function resolvePreferredStockLocationId(
  locations: StockLocationResponse[],
  options?: {
    preferredLocationId?: string | null;
    assignedTeamId?: string | null;
    vehicleIdsByTeamId?: Map<string, string>;
  },
): string {
  if (locations.length === 0) return "";
  if (options?.preferredLocationId && locations.some((l) => l.id === options.preferredLocationId)) {
    return options.preferredLocationId;
  }
  const teamId = options?.assignedTeamId?.trim();
  if (teamId && options?.vehicleIdsByTeamId) {
    const vehicleId = options.vehicleIdsByTeamId.get(teamId);
    if (vehicleId) {
      const vehicleLocation = locations.find(
        (l) => l.type === "vehicle" && l.referenceId === vehicleId,
      );
      if (vehicleLocation) return vehicleLocation.id;
    }
  }
  const defaultLocation = locations.find((l) => l.isDefault);
  return defaultLocation?.id ?? locations[0]!.id;
}

export function InterventionArticlesDialog({
  open,
  onClose,
  interventionId,
  interventionTitle,
  caseId,
  currentUsage,
  articles,
  locations = [],
  preferredLocationId,
  canEdit,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  interventionId: string;
  interventionTitle: string;
  caseId: string;
  currentUsage: InterventionArticleUsageItem[];
  articles: ArticleResponse[];
  locations?: StockLocationResponse[];
  preferredLocationId?: string | null;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [lines, setLines] = useState<ArticleLineDraft[]>([]);
  const [saving, setSaving] = useState(false);

  const defaultLocationId = useMemo(
    () => resolvePreferredStockLocationId(locations, { preferredLocationId }),
    [locations, preferredLocationId],
  );

  useEffect(() => {
    if (!open) return;
    const initial = linesFromUsage(currentUsage, defaultLocationId);
    if (initial.length > 0) {
      setLines(initial);
    } else if (canEdit) {
      setLines([
        {
          key: `new-${Date.now()}`,
          articleId: "",
          articleName: "",
          unit: "unité",
          quantity: "1",
          locationId: defaultLocationId,
        },
      ]);
    } else {
      setLines([]);
    }
  }, [open, currentUsage, canEdit, defaultLocationId]);

  const usedArticleIds = useMemo(
    () => new Set(lines.map((line) => line.articleId).filter(Boolean)),
    [lines],
  );

  const availableArticles = useMemo(
    () => articles.filter((article) => !usedArticleIds.has(article.id)),
    [articles, usedArticleIds],
  );

  const handleClose = useCallback(() => {
    if (saving) return;
    onClose();
  }, [onClose, saving]);

  const addLine = useCallback(() => {
    setLines((prev) => [
      ...prev,
      {
        key: `new-${Date.now()}-${prev.length}`,
        articleId: "",
        articleName: "",
        unit: "unité",
        quantity: "1",
        locationId: defaultLocationId,
      },
    ]);
  }, [defaultLocationId]);

  const updateLine = useCallback((key: string, patch: Partial<ArticleLineDraft>) => {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((prev) => prev.filter((line) => line.key !== key));
  }, []);

  const selectArticle = useCallback(
    (key: string, articleId: string) => {
      const article = articles.find((a) => a.id === articleId);
      if (!article) return;
      updateLine(key, {
        articleId: article.id,
        articleName: article.name,
        articleReference: article.reference,
        unit: article.unit,
        quantity: "1",
      });
    },
    [articles, updateLine],
  );

  const handleSave = useCallback(async () => {
    if (!canEdit) return;
    const incomplete = lines.some((line) => !line.articleId);
    if (incomplete) {
      showToast("Choisissez un article pour chaque ligne ou supprimez les lignes vides", "error");
      return;
    }
    if (locations.length > 0 && lines.some((line) => !line.locationId)) {
      showToast("Choisissez un emplacement pour chaque article", "error");
      return;
    }
    setSaving(true);
    try {
      const adjustments = buildUsageAdjustments(currentUsage, lines, defaultLocationId);
      for (const adjustment of adjustments) {
        await stockApi.addInterventionArticleUsage(interventionId, {
          caseId,
          articleId: adjustment.articleId,
          movementType: adjustment.movementType,
          quantity: adjustment.quantity,
          ...(adjustment.locationId ? { locationId: adjustment.locationId } : {}),
        });
      }
      showToast(
        adjustments.length > 0 ? "Articles de l'intervention mis à jour" : "Aucune modification",
      );
      onSaved();
      onClose();
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }, [
    canEdit,
    lines,
    currentUsage,
    interventionId,
    caseId,
    defaultLocationId,
    locations.length,
    showToast,
    onSaved,
    onClose,
  ]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-950/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="intervention-articles-title"
      onClick={handleClose}
    >
      <div
        className="flex max-h-[min(90vh,40rem)] w-full max-w-lg flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-100 dark:border-slate-800 px-5 py-4 shrink-0">
          <h2
            id="intervention-articles-title"
            className="text-lg font-semibold text-slate-900 dark:text-slate-100"
          >
            Articles utilisés
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 truncate">
            {interventionTitle}
          </p>
          {locations.length > 1 && (
            <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
              Chaque article peut être prélevé depuis un emplacement différent.
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0 space-y-4">
          {lines.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Aucun article pour le moment. Ajoutez les pièces ou consommables utilisés sur
              l&apos;intervention.
            </p>
          ) : (
            <ul className="space-y-2">
              {lines.map((line) => {
                const articleMeta = articles.find((a) => a.id === line.articleId);
                const lineLocation = locations.find((l) => l.id === line.locationId);
                const atLocation =
                  line.locationId && articleMeta
                    ? stockAtLocation(articleMeta, line.locationId)
                    : articleMeta?.stockQuantity;
                return (
                  <li
                    key={line.key}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-950/50 p-3"
                  >
                    <div className="flex gap-2">
                      <div className="min-w-0 flex-1 space-y-2">
                        {line.articleId ? (
                          <div>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                              {line.articleName}
                              {line.articleReference ? (
                                <span className="font-normal text-slate-500 dark:text-slate-400">
                                  {" "}
                                  · {line.articleReference}
                                </span>
                              ) : null}
                            </p>
                            {articleMeta && atLocation != null && (
                              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                {line.locationId && lineLocation
                                  ? `Stock à « ${lineLocation.name} »`
                                  : "Stock disponible"}
                                {" : "}
                                {atLocation} {articleMeta.unit}
                              </p>
                            )}
                          </div>
                        ) : (
                          <select
                            value=""
                            onChange={(e) => selectArticle(line.key, e.target.value)}
                            disabled={!canEdit || saving}
                            className={inputClassName}
                          >
                            <option value="">Choisir un article…</option>
                            {availableArticles.map((article) => (
                              <option key={article.id} value={article.id}>
                                {article.reference} — {article.name}
                              </option>
                            ))}
                          </select>
                        )}

                        {locations.length > 0 && (
                          <label className="block">
                            <span className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                              Emplacement
                            </span>
                            <select
                              value={line.locationId}
                              onChange={(e) => updateLine(line.key, { locationId: e.target.value })}
                              disabled={!canEdit || saving}
                              className={inputClassName}
                            >
                              {locations.map((loc) => (
                                <option key={loc.id} value={loc.id}>
                                  {formatLocationOption(loc)}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}

                        <label className="block">
                          <span className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            Quantité utilisée ({line.unit})
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.quantity}
                            onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                            disabled={!canEdit || saving || !line.articleId}
                            className={inputClassName}
                          />
                        </label>
                      </div>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => removeLine(line.key)}
                          disabled={saving}
                          className="shrink-0 self-start rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 disabled:opacity-50"
                          aria-label="Retirer cet article"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                            aria-hidden
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {canEdit && availableArticles.length > 0 && (
            <button
              type="button"
              onClick={addLine}
              disabled={saving}
              className="mt-1 w-full rounded-lg border border-dashed border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-400 disabled:opacity-50 transition"
            >
              + Ajouter un article
            </button>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 dark:border-slate-800 px-5 py-4 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            {canEdit ? "Annuler" : "Fermer"}
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
