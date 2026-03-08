"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/stock.api";

export function StockArticlesPage() {
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
    queryFn: () => api.listArticleMovements({ limit: 20 })
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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Stock articles</h1>
          <p className="text-sm text-slate-500">
            Gérez vos consommables, suivez les mouvements et anticipez les ruptures.
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm((prev) => !prev)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showCreateForm ? "Fermer" : "+ Nouvel article"}
        </button>
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
                className="flex items-center justify-between rounded-lg border border-amber-100 bg-white px-3 py-2"
              >
                <div>
                  <div className="text-sm font-medium text-slate-800">
                    {article.name} ({article.reference})
                  </div>
                  <div className="text-xs text-slate-500">
                    Stock: {article.stockQuantity} {article.unit} — Seuil: {article.reorderPoint}
                  </div>
                </div>
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
                  className="rounded-lg border border-amber-300 bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800 disabled:opacity-50"
                >
                  Remettre à {article.targetStock} {article.unit}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCreateForm && (
        <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">Créer un article</h2>
          <div className="grid grid-cols-3 gap-3">
            <input
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Nom"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              value={createReference}
              onChange={(e) => setCreateReference(e.target.value)}
              placeholder="Référence (SKU)"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              value={createUnit}
              onChange={(e) => setCreateUnit(e.target.value)}
              placeholder="Unité"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={createInitialStock}
              onChange={(e) => setCreateInitialStock(e.target.value)}
              placeholder="Stock initial"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={createReorderPoint}
              onChange={(e) => setCreateReorderPoint(e.target.value)}
              placeholder="Seuil d'alerte"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={createTargetStock}
              onChange={(e) => setCreateTargetStock(e.target.value)}
              placeholder="Stock cible"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
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
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              Créer l&apos;article
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-slate-800">Mouvement rapide</h2>
        <div className="grid grid-cols-4 gap-3">
          <select
            value={movementArticleId}
            onChange={(e) => setMovementArticleId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <input
            value={movementNote}
            onChange={(e) => setMovementNote(e.target.value)}
            placeholder="Note (optionnelle)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-center gap-3">
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
            className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Enregistrer le mouvement
          </button>
          {selectedMovementArticle && (
            <span className="text-xs text-slate-500">
              Stock actuel: {selectedMovementArticle.stockQuantity} {selectedMovementArticle.unit}
            </span>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un article..."
            className="w-72 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
            />
            Stock bas uniquement
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Inclure inactifs
          </label>
        </div>

        {isLoading ? (
          <div className="text-sm text-slate-500">Chargement des articles…</div>
        ) : !(articles ?? []).length ? (
          <div className="text-sm text-slate-500">Aucun article trouvé.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="px-2 py-2">Référence</th>
                  <th className="px-2 py-2">Nom</th>
                  <th className="px-2 py-2">Stock</th>
                  <th className="px-2 py-2">Seuil</th>
                  <th className="px-2 py-2">Cible</th>
                  <th className="px-2 py-2">Statut</th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {articles!.map((article) => (
                  <tr key={article.id} className="border-b border-slate-100">
                    <td className="px-2 py-2 font-mono text-xs">{article.reference}</td>
                    <td className="px-2 py-2">
                      <div className="font-medium text-slate-800">{article.name}</div>
                      {!article.isActive && (
                        <div className="text-[11px] text-slate-400">Inactif</div>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {article.stockQuantity} {article.unit}
                    </td>
                    <td className="px-2 py-2">{article.reorderPoint}</td>
                    <td className="px-2 py-2">{article.targetStock}</td>
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
                          className="rounded border border-blue-200 px-2 py-1 text-xs text-blue-700 disabled:opacity-50"
                        >
                          Réassort
                        </button>
                        {article.isActive && (
                          <button
                            onClick={() => deactivateMutation.mutate(article.id)}
                            disabled={deactivateMutation.isPending}
                            className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 disabled:opacity-50"
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

      <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Derniers mouvements</h2>
        {!recentMovements?.length ? (
          <div className="text-sm text-slate-500">Aucun mouvement pour le moment.</div>
        ) : (
          <div className="space-y-2">
            {recentMovements.map((movement) => (
              <div
                key={movement.id}
                className="flex items-center justify-between rounded-lg border border-blue-50 p-2"
              >
                <div className="text-sm">
                  <span className="font-medium text-slate-800">{movement.articleName}</span>
                  <span className="ml-2 text-xs text-slate-500">
                    ({movement.articleReference ?? "sans ref"})
                  </span>
                </div>
                <div className="text-xs text-slate-600">
                  {movement.movementType} {movement.quantity} —{" "}
                  {movement.previousStock} → {movement.newStock}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
