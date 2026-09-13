"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ArticleResponse,
  PrestationResponse,
  StockLocationResponse,
  StockLocationType,
} from "@planwise/shared";
import * as stockApi from "@/lib/stock.api";
import { useToast } from "@/components/ui/ToastProvider";
import {
  FormDialog,
  FormDialogCancelButton,
  FormDialogPrimaryButton,
} from "@/components/ui/FormDialog";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

export type InterventionArticleUsageItem = {
  articleId: string;
  articleName: string;
  articleReference?: string;
  unit: string;
  netQuantity: number;
  consumedQuantity: number;
  returnedQuantity: number;
};

export type InterventionPrestationUsageItem = {
  prestationId: string;
  prestationName: string;
  prestationReference?: string;
  unit: string;
  quantity: number;
};

type CatalogKind = "article" | "prestation";

type UsageLineDraft = {
  key: string;
  kind: CatalogKind | "";
  catalogId: string;
  name: string;
  reference?: string;
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
  lines: UsageLineDraft[],
  fallbackLocationId: string,
): UsageAdjustment[] {
  const currentById = new Map(current.map((item) => [item.articleId, item.netQuantity]));
  const targetById = new Map<string, { quantity: number; locationId: string }>();

  for (const line of lines) {
    if (line.kind !== "article" || !line.catalogId) continue;
    const qty = Number(line.quantity);
    if (!Number.isFinite(qty) || qty < 0) {
      throw new Error(`Quantité invalide pour ${line.name || "l'article sélectionné"}`);
    }
    targetById.set(line.catalogId, {
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

function linesFromUsages(
  articleUsage: InterventionArticleUsageItem[],
  prestationUsage: InterventionPrestationUsageItem[],
  defaultLocationId: string,
): UsageLineDraft[] {
  const articleLines = articleUsage
    .filter((item) => item.netQuantity > 0)
    .map((item) => ({
      key: `article-${item.articleId}`,
      kind: "article" as const,
      catalogId: item.articleId,
      name: item.articleName,
      reference: item.articleReference,
      unit: item.unit,
      quantity: String(item.netQuantity),
      locationId: defaultLocationId,
    }));
  const prestationLines = prestationUsage
    .filter((item) => item.quantity > 0)
    .map((item) => ({
      key: `prestation-${item.prestationId}`,
      kind: "prestation" as const,
      catalogId: item.prestationId,
      name: item.prestationName,
      reference: item.prestationReference,
      unit: item.unit,
      quantity: String(item.quantity),
      locationId: "",
    }));
  return [...articleLines, ...prestationLines];
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
  currentPrestationUsage = [],
  articles,
  prestations = [],
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
  currentPrestationUsage?: InterventionPrestationUsageItem[];
  articles: ArticleResponse[];
  prestations?: PrestationResponse[];
  locations?: StockLocationResponse[];
  preferredLocationId?: string | null;
  canEdit: boolean;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [lines, setLines] = useState<UsageLineDraft[]>([]);
  const [saving, setSaving] = useState(false);

  const defaultLocationId = useMemo(
    () => resolvePreferredStockLocationId(locations, { preferredLocationId }),
    [locations, preferredLocationId],
  );

  useEffect(() => {
    if (!open) return;
    const initial = linesFromUsages(currentUsage, currentPrestationUsage, defaultLocationId);
    if (initial.length > 0) {
      setLines(initial);
    } else if (canEdit) {
      setLines([
        {
          key: `new-${Date.now()}`,
          kind: "",
          catalogId: "",
          name: "",
          unit: "unité",
          quantity: "1",
          locationId: defaultLocationId,
        },
      ]);
    } else {
      setLines([]);
    }
  }, [open, currentUsage, currentPrestationUsage, canEdit, defaultLocationId]);

  const usedArticleIds = useMemo(
    () =>
      new Set(
        lines
          .filter((line) => line.kind === "article" && line.catalogId)
          .map((line) => line.catalogId),
      ),
    [lines],
  );
  const usedPrestationIds = useMemo(
    () =>
      new Set(
        lines
          .filter((line) => line.kind === "prestation" && line.catalogId)
          .map((line) => line.catalogId),
      ),
    [lines],
  );

  const catalogOptions = useMemo(() => {
    const articleOptions = articles
      .filter((article) => !usedArticleIds.has(article.id))
      .map((article) => ({
        value: `article:${article.id}`,
        label: article.reference
          ? `Article · ${article.reference} — ${article.name}`
          : `Article · ${article.name}`,
      }));
    const prestationOptions = prestations
      .filter((prestation) => !usedPrestationIds.has(prestation.id))
      .map((prestation) => ({
        value: `prestation:${prestation.id}`,
        label: prestation.reference
          ? `Prestation · ${prestation.reference} — ${prestation.name}`
          : `Prestation · ${prestation.name}`,
      }));
    return [...prestationOptions, ...articleOptions];
  }, [articles, prestations, usedArticleIds, usedPrestationIds]);

  const handleClose = useCallback(() => {
    if (saving) return;
    onClose();
  }, [onClose, saving]);

  const addLine = useCallback(() => {
    setLines((prev) => [
      ...prev,
      {
        key: `new-${Date.now()}-${prev.length}`,
        kind: "",
        catalogId: "",
        name: "",
        unit: "unité",
        quantity: "1",
        locationId: defaultLocationId,
      },
    ]);
  }, [defaultLocationId]);

  const updateLine = useCallback((key: string, patch: Partial<UsageLineDraft>) => {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((prev) => prev.filter((line) => line.key !== key));
  }, []);

  const selectCatalogItem = useCallback(
    (key: string, value: string) => {
      const [kind, id] = value.split(":") as [CatalogKind, string];
      if (kind === "article") {
        const article = articles.find((a) => a.id === id);
        if (!article) return;
        updateLine(key, {
          kind: "article",
          catalogId: article.id,
          name: article.name,
          reference: article.reference,
          unit: article.unit,
          quantity: "1",
          locationId: defaultLocationId,
        });
        return;
      }
      if (kind === "prestation") {
        const prestation = prestations.find((p) => p.id === id);
        if (!prestation) return;
        updateLine(key, {
          kind: "prestation",
          catalogId: prestation.id,
          name: prestation.name,
          reference: prestation.reference,
          unit: prestation.unit,
          quantity: "1",
          locationId: "",
        });
      }
    },
    [articles, prestations, defaultLocationId, updateLine],
  );

  const handleSave = useCallback(async () => {
    if (!canEdit) return;
    const incomplete = lines.some((line) => !line.kind || !line.catalogId);
    if (incomplete) {
      showToast(
        "Choisissez un article ou une prestation pour chaque ligne, ou supprimez les lignes vides",
        "error",
      );
      return;
    }
    if (locations.length > 0 && lines.some((line) => line.kind === "article" && !line.locationId)) {
      showToast("Choisissez un emplacement pour chaque article", "error");
      return;
    }
    for (const line of lines) {
      const qty = Number(line.quantity);
      if (!Number.isFinite(qty) || qty < 0) {
        showToast(`Quantité invalide pour ${line.name}`, "error");
        return;
      }
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

      const prestationUsages = lines
        .filter((line) => line.kind === "prestation" && line.catalogId)
        .map((line) => ({
          prestationId: line.catalogId,
          quantity: Number(line.quantity),
        }));
      const previousPrestationIds = new Set(currentPrestationUsage.map((u) => u.prestationId));
      const nextPrestationIds = new Set(prestationUsages.map((u) => u.prestationId));
      for (const previous of currentPrestationUsage) {
        if (!nextPrestationIds.has(previous.prestationId)) {
          prestationUsages.push({ prestationId: previous.prestationId, quantity: 0 });
        }
      }
      const prestationChanged =
        prestationUsages.length !== currentPrestationUsage.length ||
        prestationUsages.some((u) => {
          const prev = currentPrestationUsage.find((p) => p.prestationId === u.prestationId);
          return !prev || Math.abs(prev.quantity - u.quantity) > 0.000_001;
        }) ||
        [...previousPrestationIds].some((id) => !nextPrestationIds.has(id));

      if (prestationChanged || prestationUsages.length > 0 || currentPrestationUsage.length > 0) {
        await stockApi.setInterventionPrestationUsages(interventionId, {
          caseId,
          usages: prestationUsages,
        });
      }

      const changed = adjustments.length > 0 || prestationChanged;
      showToast(changed ? "Consommations de l'intervention mises à jour" : "Aucune modification");
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
    currentPrestationUsage,
    interventionId,
    caseId,
    defaultLocationId,
    locations.length,
    showToast,
    onSaved,
    onClose,
  ]);

  const description = (
    <>
      <span className="block truncate">{interventionTitle}</span>
      {locations.length > 1 ? (
        <span className="mt-1 block text-[11px] text-slate-400 dark:text-slate-500">
          Chaque article peut être prélevé depuis un emplacement différent. Les prestations n’ont
          pas d’emplacement stock.
        </span>
      ) : null}
    </>
  );

  return (
    <FormDialog
      open={open}
      onClose={handleClose}
      closeDisabled={saving}
      title="Articles et prestations"
      description={description}
      titleId="intervention-articles-title"
      size="md"
      zClassName="z-[100]"
      footer={
        <>
          <FormDialogCancelButton onClick={handleClose} disabled={saving}>
            {canEdit ? "Annuler" : "Fermer"}
          </FormDialogCancelButton>
          {canEdit ? (
            <FormDialogPrimaryButton
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </FormDialogPrimaryButton>
          ) : null}
        </>
      }
    >
      <div className="space-y-4">
        {lines.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Aucune consommation pour le moment. Ajoutez les articles ou prestations utilisés sur
            l&apos;intervention.
          </p>
        ) : (
          <ul className="space-y-2">
            {lines.map((line) => {
              const articleMeta =
                line.kind === "article" ? articles.find((a) => a.id === line.catalogId) : undefined;
              const lineLocation = locations.find((l) => l.id === line.locationId);
              const atLocation =
                line.kind === "article" && line.locationId && articleMeta
                  ? stockAtLocation(articleMeta, line.locationId)
                  : articleMeta?.stockQuantity;
              return (
                <li
                  key={line.key}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-950/50 p-3"
                >
                  <div className="flex gap-2">
                    <div className="min-w-0 flex-1 space-y-2">
                      {line.catalogId ? (
                        <div>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                            <span className="mr-1.5 text-[11px] font-normal uppercase tracking-wide text-slate-400">
                              {line.kind === "prestation" ? "Prestation" : "Article"}
                            </span>
                            {line.name}
                            {line.reference ? (
                              <span className="font-normal text-slate-500 dark:text-slate-400">
                                {" "}
                                · {line.reference}
                              </span>
                            ) : null}
                          </p>
                          {line.kind === "article" && articleMeta && atLocation != null && (
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
                        <SearchableSelect
                          value=""
                          onChange={(value) => selectCatalogItem(line.key, value)}
                          options={catalogOptions}
                          emptyLabel="Choisir un article ou une prestation…"
                          placeholder="Rechercher…"
                          aria-label="Article ou prestation"
                          allowEmpty={false}
                          disabled={!canEdit || saving}
                          className="min-w-0 w-full"
                        />
                      )}

                      {line.kind === "article" && locations.length > 0 && (
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
                          disabled={!canEdit || saving || !line.catalogId}
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
                        aria-label="Retirer cette ligne"
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

        {canEdit && catalogOptions.length > 0 && (
          <button
            type="button"
            onClick={addLine}
            disabled={saving}
            className="mt-1 w-full rounded-lg border border-dashed border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:border-brand-400 hover:text-brand-600 dark:hover:text-brand-400 disabled:opacity-50 transition"
          >
            + Ajouter une ligne
          </button>
        )}
      </div>
    </FormDialog>
  );
}
