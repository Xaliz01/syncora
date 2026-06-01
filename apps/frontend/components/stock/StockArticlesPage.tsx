"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  ListRow,
  ListSearchField,
  ListTableShell,
  ListToolbar,
} from "@/components/ui/list-page";

type StockPageMode = "catalog" | "movements" | "full";

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  in: "Entrée",
  out: "Sortie",
  adjustment: "Ajustement",
};

const ARTICLES_GRID = "md:grid-cols-[0.8fr_1.2fr_0.7fr_0.5fr_0.5fr_0.5fr_auto]";

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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState("");

  const [createName, setCreateName] = useState("");
  const [createReference, setCreateReference] = useState("");
  const [createUnit, setCreateUnit] = useState("unité");
  const [createInitialStock, setCreateInitialStock] = useState("0");
  const [createReorderPoint, setCreateReorderPoint] = useState("0");
  const [createTargetStock, setCreateTargetStock] = useState("0");

  const [movementArticleId, setMovementArticleId] = useState("");
  const [movementType, setMovementType] = useState<"in" | "out" | "adjustment">("out");
  const [movementQuantity, setMovementQuantity] = useState("1");
  const [movementNote, setMovementNote] = useState("");

  const { data: articles, isLoading } = useQuery({
    queryKey: ["articles", search, lowStockOnly, showInactive],
    queryFn: () =>
      api.listArticles({
        search: search || undefined,
        lowStockOnly,
        activeOnly: !showInactive,
      }),
  });

  const { data: recentMovements } = useQuery({
    queryKey: ["article-movements"],
    queryFn: () => api.listArticleMovements({ limit: 20 }),
    enabled: showMovementActions,
  });

  const lowStockArticles = useMemo(
    () => (articles ?? []).filter((article) => article.stockStatus !== "ok"),
    [articles],
  );

  const invalidateStockQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["articles"] });
    queryClient.invalidateQueries({ queryKey: ["article-movements"] });
  };

  const createArticleMutation = useMutation({
    mutationFn: (payload: api.CreateArticlePayload) => api.createArticle(payload),
    onSuccess: () => {
      invalidateStockQueries();
      setShowCreateForm(false);
      setCreateName("");
      setCreateReference("");
      setCreateUnit("unité");
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

  const deactivateMutation = useMutation({
    mutationFn: (articleId: string) => api.deleteArticle(articleId),
    onSuccess: invalidateStockQueries,
    onError: (err: Error) => setError(err.message),
  });

  const restockToTargetMutation = useMutation({
    mutationFn: (payload: api.CreateArticleMovementPayload) => api.createArticleMovement(payload),
    onSuccess: invalidateStockQueries,
    onError: (err: Error) => setError(err.message),
  });

  const selectedMovementArticle = (articles ?? []).find(
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
    search.trim() !== "" || lowStockOnly || (showCatalogActions && showInactive);

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
              {(articles ?? []).map((article) => (
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

      {isLoading ? (
        <ListLoadingState />
      ) : !(articles ?? []).length ? (
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
        <ListTableShell
          gridTemplateClass={ARTICLES_GRID}
          headerCells={
            <>
              <span>Référence</span>
              <span>Nom</span>
              <span>Stock</span>
              <span>Seuil</span>
              <span>Cible</span>
              <span>Statut</span>
              <span className="text-right md:text-left">Actions</span>
            </>
          }
        >
          {articles!.map((article) => (
            <ListRow key={article.id} gridTemplateClass={ARTICLES_GRID}>
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
              <div className="flex flex-wrap gap-2 justify-end md:justify-start">
                {showMovementActions && (
                  <button
                    type="button"
                    onClick={() =>
                      restockToTargetMutation.mutate({
                        articleId: article.id,
                        movementType: "adjustment",
                        quantity: article.targetStock,
                        reason: "restock",
                        note: "Réassort au stock cible",
                      })
                    }
                    disabled={
                      restockToTargetMutation.isPending ||
                      article.targetStock <= article.stockQuantity
                    }
                    className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-500 font-medium disabled:opacity-50"
                  >
                    Réassort
                  </button>
                )}
                {showCatalogActions && article.isActive && can("stock.articles.delete") && (
                  <button
                    type="button"
                    onClick={() => deactivateMutation.mutate(article.id)}
                    disabled={deactivateMutation.isPending}
                    className="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 disabled:opacity-50"
                  >
                    Désactiver
                  </button>
                )}
              </div>
            </ListRow>
          ))}
        </ListTableShell>
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
                    <span className="font-medium text-slate-800 dark:text-slate-100">
                      {movement.articleName}
                    </span>
                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                      ({movement.articleReference ?? "sans ref"})
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    {MOVEMENT_TYPE_LABELS[movement.movementType] ?? movement.movementType}{" "}
                    {movement.quantity} — {movement.previousStock} → {movement.newStock}
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
