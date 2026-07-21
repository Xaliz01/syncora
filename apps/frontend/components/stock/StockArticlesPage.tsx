"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MAX_PAGE_LIMIT } from "@planwise/shared";
import * as api from "@/lib/stock.api";
import { TestDataBadgeIf } from "@/components/test-data/TestDataBadge";
import { usePermissions } from "@/lib/hooks/usePermissions";
import {
  ListBadge,
  ListCellDefault,
  ListCellPrimary,
  ListEmptyState,
  ListLoadingState,
  ListNoResults,
  ListPageError,
  ListPageHeader,
  ListPageRoot,
  ListPagination,
  LIST_PAGE_SIZE,
  ListRowLink,
  ListSearchField,
  ListTableShell,
  ListToolbar,
} from "@/components/ui/list-page";

type StockPageMode = "catalog" | "movements" | "full";

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  in: "Entrée",
  out: "Sortie",
  adjustment: "Ajustement",
  transfer: "Transfert",
};

const ARTICLES_GRID = "md:grid-cols-[0.8fr_1.4fr_0.6fr_0.5fr_0.5fr_0.5fr_0.6fr]";

const STOCK_STATUS_COLORS: Record<string, string> = {
  out: "bg-red-50 text-red-700 border-red-200",
  low: "bg-amber-50 text-amber-700 border-amber-200",
  ok: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const STOCK_STATUS_LABELS: Record<string, string> = {
  out: "Rupture",
  low: "Bas",
  ok: "OK",
};

const PRIMARY_BUTTON_CLASS =
  "rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 transition self-start flex-shrink-0";

export function StockArticlesPage({ mode = "full" }: { mode?: StockPageMode }) {
  const { can } = usePermissions();
  const showCatalogActions = mode !== "movements" && can("stock.articles.create");
  const showMovementActions = mode !== "catalog" && can("stock.movements.create");
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [offset, setOffset] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState("");

  const [createName, setCreateName] = useState("");
  const [createReference, setCreateReference] = useState("");
  const [createUnit, setCreateUnit] = useState("unité");
  const [createDefaultPrice, setCreateDefaultPrice] = useState("");
  const [createInitialStock, setCreateInitialStock] = useState("0");
  const [createReorderPoint, setCreateReorderPoint] = useState("0");
  const [createTargetStock, setCreateTargetStock] = useState("0");

  const [movementArticleId, setMovementArticleId] = useState("");
  const [movementType, setMovementType] = useState<"in" | "out" | "adjustment">("out");
  const [movementQuantity, setMovementQuantity] = useState("1");
  const [movementNote, setMovementNote] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");

  const [showTransferForm, setShowTransferForm] = useState(false);
  const [transferArticleId, setTransferArticleId] = useState("");
  const [transferSourceId, setTransferSourceId] = useState("");
  const [transferDestId, setTransferDestId] = useState("");
  const [transferQuantity, setTransferQuantity] = useState("1");
  const [transferNote, setTransferNote] = useState("");

  const { data: stockLocations } = useQuery({
    queryKey: ["stock-locations"],
    queryFn: () => api.listStockLocations(),
  });

  const hasLocations = (stockLocations ?? []).length > 0;

  useEffect(() => {
    setOffset(0);
  }, [search, lowStockOnly, showInactive, selectedLocationId]);

  const { data: articlesData, isLoading } = useQuery({
    queryKey: ["articles", search, lowStockOnly, showInactive, selectedLocationId, offset],
    queryFn: () =>
      api.listArticles({
        search: search || undefined,
        lowStockOnly,
        activeOnly: !showInactive,
        locationId: selectedLocationId || undefined,
        limit: LIST_PAGE_SIZE,
        offset,
      }),
  });

  const articles = articlesData?.articles ?? [];
  const total = articlesData?.total ?? 0;

  const { data: pickerArticlesData } = useQuery({
    queryKey: ["articles", "pickers"],
    queryFn: () => api.listArticles({ activeOnly: true, limit: MAX_PAGE_LIMIT }),
    enabled: showMovementActions,
  });

  const pickerArticles = pickerArticlesData?.articles ?? [];

  const { data: recentMovements } = useQuery({
    queryKey: ["article-movements", selectedLocationId],
    queryFn: () =>
      api.listArticleMovements({
        limit: 20,
        locationId: selectedLocationId || undefined,
      }),
    enabled: showMovementActions,
  });

  const lowStockArticles = useMemo(
    () => articles.filter((article) => article.stockStatus !== "ok"),
    [articles],
  );

  const invalidateStockQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["articles"] });
    queryClient.invalidateQueries({ queryKey: ["article-movements"] });
    queryClient.invalidateQueries({ queryKey: ["stock-locations"] });
  };

  const createArticleMutation = useMutation({
    mutationFn: (payload: api.CreateArticlePayload) => api.createArticle(payload),
    onSuccess: () => {
      invalidateStockQueries();
      setShowCreateForm(false);
      setCreateName("");
      setCreateReference("");
      setCreateUnit("unité");
      setCreateDefaultPrice("");
      setCreateInitialStock("0");
      setCreateReorderPoint("0");
      setCreateTargetStock("0");
      setError("");
    },
    onError: (err: Error) => setError(err.message),
  });

  const movementMutation = useMutation({
    mutationFn: (payload: api.CreateArticleMovementPayload) => api.createArticleMovement(payload),
    onSuccess: () => {
      invalidateStockQueries();
      setMovementNote("");
      setError("");
    },
    onError: (err: Error) => setError(err.message),
  });

  const restockToTargetMutation = useMutation({
    mutationFn: (payload: api.CreateArticleMovementPayload) => api.createArticleMovement(payload),
    onSuccess: invalidateStockQueries,
    onError: (err: Error) => setError(err.message),
  });

  const transferMutation = useMutation({
    mutationFn: (payload: api.CreateStockTransferPayload) => api.createStockTransfer(payload),
    onSuccess: () => {
      invalidateStockQueries();
      setShowTransferForm(false);
      setTransferArticleId("");
      setTransferSourceId("");
      setTransferDestId("");
      setTransferQuantity("1");
      setTransferNote("");
      setError("");
    },
    onError: (err: Error) => setError(err.message),
  });

  const selectedMovementArticle = pickerArticles.find(
    (article) => article.id === movementArticleId,
  );
  const pageTitle =
    mode === "catalog"
      ? "Catalogue articles"
      : mode === "movements"
        ? "Mouvements de stock"
        : "Stock articles";
  const pageDescription =
    mode === "catalog"
      ? "Paramétrez les articles utilisés par les équipes terrain."
      : mode === "movements"
        ? "Pilotez les entrées, sorties et ajustements de stock au quotidien."
        : "Gérez vos consommables, suivez les mouvements et anticipez les ruptures.";

  const hasActiveFilters =
    search.trim() !== "" ||
    lowStockOnly ||
    (showCatalogActions && showInactive) ||
    !!selectedLocationId;

  return (
    <ListPageRoot>
      <ListPageHeader
        title={pageTitle}
        description={pageDescription}
        action={
          showCatalogActions ? (
            <button
              type="button"
              onClick={() => setShowCreateForm((prev) => !prev)}
              className={PRIMARY_BUTTON_CLASS}
            >
              {showCreateForm ? "Fermer" : "Nouvel article"}
            </button>
          ) : undefined
        }
      />

      {error ? <ListPageError message={error} fallbackMessage="Une erreur est survenue." /> : null}

      <ListToolbar>
        <ListSearchField value={search} onChange={setSearch} placeholder="Rechercher un article…" />
        {hasLocations && (
          <select
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
          >
            <option value="">Tous les emplacements</option>
            {(stockLocations ?? []).map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        )}
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
          />
          Stock bas uniquement
        </label>
        {showCatalogActions && (
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Inclure inactifs
          </label>
        )}
      </ListToolbar>

      {lowStockArticles.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
          <div className="mb-2 text-sm font-semibold text-amber-800">
            Alertes stock ({lowStockArticles.length})
          </div>
          <div className="space-y-2">
            {lowStockArticles.slice(0, 6).map((article) => (
              <div
                key={article.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg border border-amber-100 bg-white dark:bg-slate-900 px-3 py-2 gap-2"
              >
                <div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                    {article.name} ({article.reference})
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Stock: {article.stockQuantity} {article.unit} — Seuil: {article.reorderPoint}
                  </div>
                </div>
                {showMovementActions ? (
                  <button
                    onClick={() =>
                      restockToTargetMutation.mutate({
                        articleId: article.id,
                        movementType: "adjustment",
                        quantity: article.targetStock,
                        reason: "restock",
                        note: "Réapprovisionnement rapide au stock cible",
                      })
                    }
                    disabled={
                      restockToTargetMutation.isPending ||
                      article.targetStock <= article.stockQuantity
                    }
                    className="rounded-lg border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800 disabled:opacity-50 self-start flex-shrink-0"
                  >
                    Remettre à {article.targetStock} {article.unit}
                  </button>
                ) : (
                  <span className="text-xs text-amber-700">
                    Stock cible: {article.targetStock} {article.unit}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showCatalogActions && showCreateForm && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <h2 className="mb-3 font-semibold text-slate-900 dark:text-slate-100">
            Créer un article
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Ex: Câble RJ45 Cat.6"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Référence (SKU) <span className="text-red-500">*</span>
              </label>
              <input
                value={createReference}
                onChange={(e) => setCreateReference(e.target.value)}
                placeholder="Ex: CAB-RJ45-001"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Unité de mesure
              </label>
              <input
                value={createUnit}
                onChange={(e) => setCreateUnit(e.target.value)}
                placeholder="Ex: mètre, unité, litre"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Prix par défaut (€ HT)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={createDefaultPrice}
                onChange={(e) => setCreateDefaultPrice(e.target.value)}
                placeholder="Optionnel"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
              />
              <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                Pré-rempli automatiquement sur les devis
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Stock initial
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={createInitialStock}
                onChange={(e) => setCreateInitialStock(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
              />
              <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                Quantité en stock au démarrage
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Seuil d&apos;alerte
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={createReorderPoint}
                onChange={(e) => setCreateReorderPoint(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
              />
              <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                Alerte quand le stock passe en dessous
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Stock cible
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={createTargetStock}
                onChange={(e) => setCreateTargetStock(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
              />
              <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                Niveau de stock optimal visé
              </p>
            </div>
          </div>
          <div className="mt-3">
            <button
              onClick={() => {
                if (!createName.trim() || !createReference.trim()) {
                  setError("Le nom et la référence sont obligatoires");
                  return;
                }
                createArticleMutation.mutate({
                  name: createName.trim(),
                  reference: createReference.trim(),
                  unit: createUnit.trim() || "unité",
                  defaultPrice: createDefaultPrice ? Number(createDefaultPrice) : undefined,
                  initialStock: Number(createInitialStock || 0),
                  reorderPoint: Number(createReorderPoint || 0),
                  targetStock: Number(createTargetStock || 0),
                });
              }}
              disabled={createArticleMutation.isPending}
              className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition"
            >
              Créer l&apos;article
            </button>
          </div>
        </div>
      )}

      {showMovementActions && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Mouvement rapide</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <select
              value={movementArticleId}
              onChange={(e) => setMovementArticleId(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
            >
              <option value="">Choisir un article</option>
              {pickerArticles.map((article) => (
                <option key={article.id} value={article.id}>
                  {article.reference} — {article.name}
                </option>
              ))}
            </select>
            <select
              value={movementType}
              onChange={(e) => setMovementType(e.target.value as "in" | "out" | "adjustment")}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
            >
              <option value="out">Sortie (consommation)</option>
              <option value="in">Entrée (réassort/retour)</option>
              <option value="adjustment">Ajustement (stock final)</option>
            </select>
            <input
              type="number"
              min="0"
              step="0.01"
              value={movementQuantity}
              onChange={(e) => setMovementQuantity(e.target.value)}
              placeholder={movementType === "adjustment" ? "Stock final" : "Quantité"}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
            />
            <input
              value={movementNote}
              onChange={(e) => setMovementNote(e.target.value)}
              placeholder="Note (optionnelle)"
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                if (!movementArticleId) {
                  setError("Sélectionnez un article");
                  return;
                }
                const quantity = Number(movementQuantity);
                if (!Number.isFinite(quantity) || quantity < 0) {
                  setError("Quantité invalide");
                  return;
                }
                movementMutation.mutate({
                  articleId: movementArticleId,
                  movementType,
                  quantity,
                  note: movementNote.trim() || undefined,
                });
              }}
              disabled={movementMutation.isPending}
              className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition"
            >
              Enregistrer le mouvement
            </button>
            {selectedMovementArticle && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Stock actuel: {selectedMovementArticle.stockQuantity} {selectedMovementArticle.unit}
              </span>
            )}
          </div>
        </div>
      )}

      {hasLocations && showMovementActions && can("stock.transfers.create") && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">
              Transfert entre emplacements
            </h2>
            <button
              type="button"
              onClick={() => setShowTransferForm((prev) => !prev)}
              className="text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium"
            >
              {showTransferForm ? "Masquer" : "Nouveau transfert"}
            </button>
          </div>
          {showTransferForm && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <select
                  value={transferArticleId}
                  onChange={(e) => setTransferArticleId(e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
                >
                  <option value="">Choisir un article</option>
                  {pickerArticles.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.reference} — {a.name}
                    </option>
                  ))}
                </select>
                <select
                  value={transferSourceId}
                  onChange={(e) => setTransferSourceId(e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
                >
                  <option value="">Source</option>
                  {(stockLocations ?? []).map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
                <select
                  value={transferDestId}
                  onChange={(e) => setTransferDestId(e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
                >
                  <option value="">Destination</option>
                  {(stockLocations ?? [])
                    .filter((loc) => loc.id !== transferSourceId)
                    .map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                </select>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={transferQuantity}
                  onChange={(e) => setTransferQuantity(e.target.value)}
                  placeholder="Quantité"
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
                />
                <input
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder="Note (optionnelle)"
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={() => {
                  if (!transferArticleId || !transferSourceId || !transferDestId) {
                    setError("Sélectionnez un article, une source et une destination");
                    return;
                  }
                  const qty = Number(transferQuantity);
                  if (!Number.isFinite(qty) || qty <= 0) {
                    setError("Quantité invalide");
                    return;
                  }
                  transferMutation.mutate({
                    articleId: transferArticleId,
                    sourceLocationId: transferSourceId,
                    destinationLocationId: transferDestId,
                    quantity: qty,
                    note: transferNote.trim() || undefined,
                  });
                }}
                disabled={transferMutation.isPending}
                className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition"
              >
                Transférer
              </button>
            </>
          )}
        </div>
      )}

      {isLoading ? (
        <ListLoadingState />
      ) : total === 0 ? (
        hasActiveFilters ? (
          <ListNoResults message="Aucun article ne correspond à ces filtres." />
        ) : (
          <ListEmptyState
            message="Aucun article."
            action={
              showCatalogActions ? (
                <button
                  type="button"
                  onClick={() => setShowCreateForm(true)}
                  className="text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium"
                >
                  Créer votre premier article
                </button>
              ) : undefined
            }
          />
        )
      ) : (
        <>
          <ListTableShell
            gridTemplateClass={ARTICLES_GRID}
            headerCells={
              <>
                <span>Référence</span>
                <span>Nom</span>
                <span>Prix HT</span>
                <span>Stock</span>
                <span>Seuil</span>
                <span>Cible</span>
                <span>Statut</span>
              </>
            }
          >
            {articles.map((article) => (
              <ListRowLink
                key={article.id}
                href={`/settings/stock/articles/${article.id}`}
                gridTemplateClass={ARTICLES_GRID}
              >
                <ListCellDefault className="font-mono text-xs">{article.reference}</ListCellDefault>
                <div className="min-w-0">
                  <ListCellPrimary className="block">
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <span className="truncate">{article.name}</span>
                      <TestDataBadgeIf isTestData={article.isTestData} />
                    </span>
                  </ListCellPrimary>
                  {!article.isActive && (
                    <span className="text-xs text-slate-400 dark:text-slate-500">Inactif</span>
                  )}
                </div>
                <ListCellDefault>
                  {article.defaultPrice !== undefined
                    ? `${article.defaultPrice.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`
                    : "—"}
                </ListCellDefault>
                <ListCellDefault>
                  {article.stockQuantity} {article.unit}
                </ListCellDefault>
                <ListCellDefault>{article.reorderPoint}</ListCellDefault>
                <ListCellDefault>{article.targetStock}</ListCellDefault>
                <ListBadge
                  className={
                    STOCK_STATUS_COLORS[article.stockStatus] ??
                    "bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                  }
                >
                  {STOCK_STATUS_LABELS[article.stockStatus] ?? article.stockStatus}
                </ListBadge>
              </ListRowLink>
            ))}
          </ListTableShell>
          <ListPagination
            offset={offset}
            limit={LIST_PAGE_SIZE}
            total={total}
            onOffsetChange={setOffset}
          />
        </>
      )}

      {showMovementActions && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <h2 className="mb-3 font-semibold text-slate-900 dark:text-slate-100">
            Derniers mouvements
          </h2>
          {!recentMovements?.length ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Aucun mouvement pour le moment.
            </div>
          ) : (
            <div className="space-y-2">
              {recentMovements.map((movement) => (
                <div
                  key={movement.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg border border-slate-100 dark:border-slate-800 p-2 gap-1"
                >
                  <div className="text-sm">
                    <Link
                      href={`/settings/stock/articles/${movement.articleId}`}
                      className="font-medium text-brand-600 dark:text-brand-400 hover:underline"
                    >
                      {movement.articleName}
                    </Link>
                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                      ({movement.articleReference ?? "sans ref"})
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    {MOVEMENT_TYPE_LABELS[movement.movementType] ?? movement.movementType}{" "}
                    {movement.quantity}
                    {movement.movementType === "transfer"
                      ? ` — ${movement.locationName ?? "?"} → ${movement.destinationLocationName ?? "?"}`
                      : ` — ${movement.previousStock} → ${movement.newStock}`}
                    {movement.locationName && movement.movementType !== "transfer" && (
                      <span className="ml-1 text-slate-400">({movement.locationName})</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </ListPageRoot>
  );
}
