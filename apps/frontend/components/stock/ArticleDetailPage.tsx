"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as stockApi from "@/lib/stock.api";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { ResourceNotFoundPanel } from "@/components/ui/AppErrorAlert";
import { PlanwiseLoader } from "@/components/ui/PlanwiseLoader";
import { TestDataBadgeIf } from "@/components/test-data/TestDataBadge";
import { StockMovementsHistory } from "@/components/stock/StockMovementsHistory";
import { PageBreadcrumb } from "@/components/ui/FormDialog";

const STOCK_STATUS_LABELS: Record<string, string> = {
  out: "Rupture",
  low: "Stock bas",
  ok: "OK",
};

const STOCK_STATUS_COLORS: Record<string, string> = {
  out: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
  low: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  ok: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
};

export function ArticleDetailPage({ articleId }: { articleId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const { can } = usePermissions();
  const canReadMovements = can("stock.movements.read");
  const canReadLocations = can("stock.locations.read") || can("stock.interventions.read");
  const canUpdate = can("stock.articles.update");
  const canDeactivate = can("stock.articles.delete");

  const {
    data: article,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["article", articleId],
    queryFn: () => stockApi.getArticle(articleId),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["stock-locations"],
    queryFn: () => stockApi.listStockLocations(),
    enabled: canReadLocations,
  });

  const { data: movements = [], isLoading: movementsLoading } = useQuery({
    queryKey: ["stock-movements", "article", articleId],
    queryFn: () => stockApi.listArticleMovements({ articleId, limit: 100 }),
    enabled: canReadMovements,
  });

  const deactivateMutation = useMutation({
    mutationFn: () => stockApi.deleteArticle(articleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      showToast("Article désactivé.");
      router.push("/settings/stock/articles");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const locationNameById = useMemo(
    () => new Map(locations.map((l) => [l.id, l.name])),
    [locations],
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <PlanwiseLoader size="md" label="Chargement…" />
      </div>
    );
  }

  if (isError || !article) {
    return (
      <ResourceNotFoundPanel
        error={isError ? error : undefined}
        resourceLabel="Article"
        backHref="/settings/stock/articles"
        backLabel="Retour au catalogue"
        onRetry={() => void refetch()}
      />
    );
  }

  const locationStocks = (article.locationStocks ?? [])
    .map((entry) => ({
      ...entry,
      locationName:
        entry.locationName ?? locationNameById.get(entry.locationId) ?? entry.locationId,
    }))
    .sort((a, b) => a.locationName.localeCompare(b.locationName, "fr"));

  return (
    <div className="space-y-6">
      <div>
        <PageBreadcrumb href="/settings/stock/articles" label="Catalogue articles" />
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 truncate">
                {article.name}
              </h1>
              <TestDataBadgeIf isTestData={article.isTestData} />
              <span
                className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${STOCK_STATUS_COLORS[article.stockStatus] ?? ""}`}
              >
                {STOCK_STATUS_LABELS[article.stockStatus] ?? article.stockStatus}
              </span>
              {!article.isActive && (
                <span className="text-xs text-slate-400 dark:text-slate-500">Inactif</span>
              )}
            </div>
            <p className="mt-1 font-mono text-sm text-slate-500 dark:text-slate-400">
              {article.reference}
            </p>
            {article.description && (
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {article.description}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {canUpdate && (
              <Link
                href={`/settings/stock/articles/${articleId}/edit`}
                className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500"
              >
                Modifier
              </Link>
            )}
            {canDeactivate && article.isActive && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirm({
                    title: "Désactiver l’article",
                    description: `Désactiver « ${article.name} » ? Il ne sera plus proposé pour les nouvelles consommations.`,
                    confirmLabel: "Désactiver",
                    variant: "danger",
                  });
                  if (ok) deactivateMutation.mutate();
                }}
                disabled={deactivateMutation.isPending}
                className="rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                Désactiver
              </button>
            )}
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">Stock total</dt>
            <dd className="mt-0.5 font-semibold text-slate-900 dark:text-slate-100">
              {article.stockQuantity} {article.unit}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">Seuil</dt>
            <dd className="mt-0.5 text-slate-800 dark:text-slate-100">{article.reorderPoint}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">Cible</dt>
            <dd className="mt-0.5 text-slate-800 dark:text-slate-100">{article.targetStock}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">Prix HT</dt>
            <dd className="mt-0.5 text-slate-800 dark:text-slate-100">
              {article.defaultPrice !== undefined
                ? `${article.defaultPrice.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €`
                : "—"}
            </dd>
          </div>
        </dl>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Stock par emplacement
        </h2>
        {locationStocks.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Aucun stock ventilé par emplacement. Les quantités sont suivies au global, ou transférez
            des pièces vers un emplacement.
          </p>
        ) : (
          <ul className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
            {locationStocks.map((entry) => (
              <li
                key={entry.locationId}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <Link
                  href={`/settings/stock/locations/${entry.locationId}`}
                  className="font-medium text-brand-600 dark:text-brand-400 hover:underline truncate"
                >
                  {entry.locationName}
                </Link>
                <span className="tabular-nums text-slate-800 dark:text-slate-100 shrink-0">
                  {entry.quantity} {article.unit}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Historique des mouvements
        </h2>
        {!canReadMovements ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Vous n’avez pas la permission de consulter les mouvements de stock.
          </p>
        ) : (
          <StockMovementsHistory
            movements={movements}
            isLoading={movementsLoading}
            emptyMessage="Aucun mouvement pour cet article."
          />
        )}
      </section>
    </div>
  );
}
