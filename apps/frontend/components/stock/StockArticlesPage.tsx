"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/stock.api";

type StockPageMode = "catalog" | "movements" | "full";

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  in: "Entrée",
  out: "Sortie",
  adjustment: "Ajustement"
};

export function StockArticlesPage({ mode = "full" }: { mode?: StockPageMode }) {
  const showCatalogActions = mode !== "movements";
  const showMovementActions = mode !== "catalog";
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
        activeOnly: !showInactive
      })
  });

  const { data: recentMovements } = useQuery({
    queryKey: ["article-movements"],
    queryFn: () => api.listArticleMovements({ limit: 20 }),
    enabled: showMovementActions
  });

  const lowStockArticles = useMemo(
    () => (articles ?? []).filter((article) => article.stockStatus !== "ok"),
    [articles]
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
    onError: (err: Error) => setError(err.message)
  });

  const movementMutation = useMutation({
    mutationFn: (payload: api.CreateArticleMovementPayload) => api.createArticleMovement(payload),
    onSuccess: () => {
      invalidateStockQueries();
      setMovementNote("");
      setError("");
    },
    onError: (err: Error) => setError(err.message)
  });

  const deactivateMutation = useMutation({
    mutationFn: (articleId: string) => api.deleteArticle(articleId),
    onSuccess: invalidateStockQueries,
    onError: (err: Error) => setError(err.message)
  });

  const restockToTargetMutation = useMutation({
    mutationFn: (payload: api.CreateArticleMovementPayload) => api.createArticleMovement(payload),
    onSuccess: invalidateStockQueries,
    onError: (err: Error) => setError(err.message)
  });

  const selectedMovementArticle = (articles ?? []).find((article) => article.id === movementArticleId);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">{pageTitle}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{pageDescription}</p>
        </div>
        {showCatalogActions && (
          <button
            onClick={() => setShowCreateForm((prev) => !prev)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 transition self-start flex-shrink-0"
          >
            {showCreateForm ? "Fermer" : "+ Nouvel article"}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

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
                        note: "Réapprovisionnement rapide au stock cible"
                      })
                    }
                    disabled={
                      restockToTargetMutation.isPending || article.targetStock <= article.stockQuantity
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
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm dark:shadow-slate-950/20">
          <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">Créer un article</h2>
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
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Unité de mesure</label>
              <input
                value={createUnit}
                onChange={(e) => setCreateUnit(e.target.value)}
                placeholder="Ex: mètre, unité, litre"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Stock initial</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={createInitialStock}
                onChange={(e) => setCreateInitialStock(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
              />
              <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">Quantité en stock au démarrage</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Seuil d&apos;alerte</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={createReorderPoint}
                onChange={(e) => setCreateReorderPoint(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
              />
              <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">Alerte quand le stock passe en dessous</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Stock cible</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={createTargetStock}
                onChange={(e) => setCreateTargetStock(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
              />
              <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">Niveau de stock optimal visé</p>
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
                  targetStock: Number(createTargetStock || 0)
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
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm dark:shadow-slate-950/20 space-y-3">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Mouvement rapide</h2>
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
                  note: movementNote.trim() || undefined
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

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm dark:shadow-slate-950/20">
        <div className="mb-3 flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un article..."
            className="w-full sm:w-72 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
          />
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
        </div>

        {isLoading ? (
          <div className="text-sm text-slate-500 dark:text-slate-400">Chargement des articles…</div>
        ) : !(articles ?? []).length ? (
          <div className="text-sm text-slate-500 dark:text-slate-400">Aucun article trouvé.</div>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-slate-500 dark:text-slate-400">
                  <th className="px-2 py-2">Référence</th>
                  <th className="px-2 py-2">Nom</th>
                  <th className="px-2 py-2">Stock</th>
                  <th className="px-2 py-2 hidden sm:table-cell">Seuil</th>
                  <th className="px-2 py-2 hidden sm:table-cell">Cible</th>
                  <th className="px-2 py-2">Statut</th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {articles!.map((article) => (
                  <tr key={article.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-2 py-2 font-mono text-xs">{article.reference}</td>
                    <td className="px-2 py-2">
                      <div className="font-medium text-slate-800 dark:text-slate-100">{article.name}</div>
                      {!article.isActive && (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500">Inactif</div>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {article.stockQuantity} {article.unit}
                    </td>
                    <td className="px-2 py-2 hidden sm:table-cell">{article.reorderPoint}</td>
                    <td className="px-2 py-2 hidden sm:table-cell">{article.targetStock}</td>
                    <td className="px-2 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          article.stockStatus === "out"
                            ? "bg-red-50 text-red-700"
                            : article.stockStatus === "low"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-green-50 text-green-700"
                        }`}
                      >
                        {article.stockStatus === "out"
                          ? "Rupture"
                          : article.stockStatus === "low"
                            ? "Bas"
                            : "OK"}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-2">
                        {showMovementActions && (
                          <button
                            onClick={() =>
                              restockToTargetMutation.mutate({
                                articleId: article.id,
                                movementType: "adjustment",
                                quantity: article.targetStock,
                                reason: "restock",
                                note: "Réassort au stock cible"
                              })
                            }
                            disabled={
                              restockToTargetMutation.isPending ||
                              article.targetStock <= article.stockQuantity
                            }
                            className="rounded border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs text-brand-600 dark:text-brand-400 disabled:opacity-50"
                          >
                            Réassort
                          </button>
                        )}
                        {showCatalogActions && article.isActive && (
                          <button
                            onClick={() => deactivateMutation.mutate(article.id)}
                            disabled={deactivateMutation.isPending}
                            className="rounded border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs text-slate-600 dark:text-slate-300 disabled:opacity-50"
                          >
                            Désactiver
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showMovementActions && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm dark:shadow-slate-950/20">
          <h2 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">Derniers mouvements</h2>
          {!recentMovements?.length ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">Aucun mouvement pour le moment.</div>
          ) : (
            <div className="space-y-2">
              {recentMovements.map((movement) => (
                <div
                  key={movement.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg border border-slate-100 dark:border-slate-800 p-2 gap-1"
                >
                  <div className="text-sm">
                    <span className="font-medium text-slate-800 dark:text-slate-100">{movement.articleName}</span>
                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                      ({movement.articleReference ?? "sans ref"})
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    {MOVEMENT_TYPE_LABELS[movement.movementType] ?? movement.movementType} {movement.quantity} —{" "}
                    {movement.previousStock} → {movement.newStock}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
