"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StockLocationType } from "@planwise/shared";
import * as stockApi from "@/lib/stock.api";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { ResourceNotFoundPanel } from "@/components/ui/AppErrorAlert";
import { TestDataBadgeIf } from "@/components/test-data/TestDataBadge";
import { StockMovementsHistory } from "@/components/stock/StockMovementsHistory";

const LOCATION_TYPE_LABELS: Record<StockLocationType, string> = {
  warehouse: "Entrepôt",
  agence: "Agence",
  vehicle: "Véhicule",
};

const LOCATION_TYPE_COLORS: Record<StockLocationType, string> = {
  warehouse:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  agence:
    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800",
  vehicle:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
};

const inputClassName =
  "w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100";

export function StockLocationDetailPage({ locationId }: { locationId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const { can } = usePermissions();
  const canReadArticles = can("stock.articles.read");
  const canReadMovements = can("stock.movements.read");
  const canUpdate = can("stock.locations.update");
  const canDelete = can("stock.locations.delete");

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");

  const {
    data: location,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["stock-location", locationId],
    queryFn: () => stockApi.getStockLocation(locationId),
  });

  const { data: articles = [], isLoading: articlesLoading } = useQuery({
    queryKey: ["articles", "by-location", locationId],
    queryFn: () => stockApi.listArticles({ locationId, activeOnly: true }),
    enabled: canReadArticles,
  });

  const { data: movements = [], isLoading: movementsLoading } = useQuery({
    queryKey: ["stock-movements", "location", locationId],
    queryFn: () => stockApi.listArticleMovements({ locationId, limit: 100 }),
    enabled: canReadMovements,
  });

  useEffect(() => {
    if (!location || isEditing) return;
    setEditName(location.name);
    setEditAddress(location.address ?? "");
  }, [location, isEditing]);

  const updateMutation = useMutation({
    mutationFn: (payload: stockApi.UpdateStockLocationPayload) =>
      stockApi.updateStockLocation(locationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-location", locationId] });
      queryClient.invalidateQueries({ queryKey: ["stock-locations"] });
      setIsEditing(false);
      showToast("Emplacement mis à jour.");
      void refetch();
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => stockApi.deleteStockLocation(locationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-locations"] });
      showToast("Emplacement supprimé.");
      router.push("/settings/stock/locations");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const stockLines = useMemo(() => {
    return articles
      .map((article) => {
        const entry = article.locationStocks?.find((ls) => ls.locationId === locationId);
        const quantity = entry?.quantity ?? 0;
        return { article, quantity };
      })
      .filter((line) => line.quantity > 0)
      .sort((a, b) => a.article.name.localeCompare(b.article.name, "fr"));
  }, [articles, locationId]);

  if (isLoading) {
    return <div className="text-sm text-slate-500 dark:text-slate-400">Chargement…</div>;
  }

  if (isError || !location) {
    return (
      <ResourceNotFoundPanel
        error={isError ? error : undefined}
        resourceLabel="Emplacement"
        backHref="/settings/stock/locations"
        backLabel="← Emplacements de stock"
        onRetry={() => void refetch()}
      />
    );
  }

  const handleSave = () => {
    if (!editName.trim()) {
      showToast("Le nom est obligatoire.", "error");
      return;
    }
    updateMutation.mutate({
      name: editName.trim(),
      address: editAddress.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings/stock/locations"
          className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:text-brand-500"
        >
          ← Emplacements de stock
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <div className="space-y-3 max-w-lg">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">Nom</span>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={inputClassName}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">Adresse</span>
                  <input
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className={inputClassName}
                  />
                </label>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  {location.name}
                </h1>
                <TestDataBadgeIf isTestData={location.isTestData} />
                <span
                  className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${LOCATION_TYPE_COLORS[location.type]}`}
                >
                  {LOCATION_TYPE_LABELS[location.type]}
                </span>
                {location.isDefault && (
                  <span className="text-xs text-slate-400 dark:text-slate-500">Par défaut</span>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {canUpdate && !isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500"
              >
                Modifier
              </button>
            )}
            {isEditing && (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={updateMutation.isPending}
                  className="rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
                >
                  {updateMutation.isPending ? "Enregistrement…" : "Enregistrer"}
                </button>
              </>
            )}
            {canDelete && !location.isDefault && !isEditing && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirm({
                    title: "Supprimer l’emplacement",
                    description: `Supprimer « ${location.name} » ? Tout le stock doit avoir été transféré au préalable.`,
                    confirmLabel: "Supprimer",
                    variant: "danger",
                  });
                  if (ok) deleteMutation.mutate();
                }}
                disabled={deleteMutation.isPending}
                className="rounded-lg border border-red-200 dark:border-red-800 px-3 py-1.5 text-sm text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-50"
              >
                Supprimer
              </button>
            )}
          </div>
        </div>

        {!isEditing && (
          <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {(location.referenceName || location.referenceId) && (
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">Référence liée</dt>
                <dd className="mt-0.5 text-slate-800 dark:text-slate-100">
                  {location.referenceName ?? location.referenceId}
                </dd>
              </div>
            )}
            {location.address && (
              <div>
                <dt className="text-xs text-slate-500 dark:text-slate-400">Adresse</dt>
                <dd className="mt-0.5 text-slate-800 dark:text-slate-100">{location.address}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">Articles en stock</dt>
              <dd className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">
                {stockLines.length}
              </dd>
            </div>
          </dl>
        )}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Stock présent</h2>
        {!canReadArticles ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Vous n’avez pas la permission de consulter le catalogue articles.
          </p>
        ) : articlesLoading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Chargement du stock…</p>
        ) : stockLines.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Aucun article avec du stock sur cet emplacement. Transférez des pièces depuis un autre
            emplacement.
          </p>
        ) : (
          <ul className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
            {stockLines.map(({ article, quantity }) => (
              <li
                key={article.id}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <Link
                    href={`/settings/stock/articles/${article.id}`}
                    className="font-medium text-brand-600 dark:text-brand-400 hover:underline truncate block"
                  >
                    {article.name}
                  </Link>
                  <p className="text-xs font-mono text-slate-400 dark:text-slate-500">
                    {article.reference}
                  </p>
                </div>
                <span className="tabular-nums text-slate-800 dark:text-slate-100 shrink-0">
                  {quantity} {article.unit}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Historique (mouvements & transferts)
        </h2>
        {!canReadMovements ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Vous n’avez pas la permission de consulter les mouvements de stock.
          </p>
        ) : (
          <StockMovementsHistory
            movements={movements}
            isLoading={movementsLoading}
            showArticleName
            articleHref={(id) => `/settings/stock/articles/${id}`}
            emptyMessage="Aucun mouvement ni transfert pour cet emplacement."
          />
        )}
      </section>
    </div>
  );
}
