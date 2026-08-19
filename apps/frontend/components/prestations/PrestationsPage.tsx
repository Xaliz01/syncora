"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/stock.api";
import { TestDataBadgeIf } from "@/components/test-data/TestDataBadge";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import {
  ListCellDefault,
  ListCellMuted,
  ListCellPrimary,
  ListEmptyState,
  ListLoadingState,
  ListNoResults,
  ListPageError,
  ListPageHeader,
  ListPageRoot,
  ListPagination,
  LIST_PAGE_SIZE,
  ListPrimaryAction,
  ListSearchField,
  ListTableShell,
  ListToolbar,
} from "@/components/ui/list-page";
import { PermissionGate } from "@/components/auth/PermissionGate";

const GRID = "md:grid-cols-[1.2fr_0.7fr_0.7fr_0.5fr_0.5fr_0.8fr]";

export function PrestationsPage() {
  const { can } = usePermissions();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("q")?.trim() ?? "";
  const [search, setSearch] = useState(initialSearch);
  const [offset, setOffset] = useState(0);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    setOffset(0);
  }, [search, showInactive]);

  useEffect(() => {
    const fromUrl = searchParams.get("q")?.trim() ?? "";
    setSearch(fromUrl);
  }, [searchParams]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["prestations", search, showInactive, offset],
    queryFn: () =>
      api.listPrestations({
        search: search.trim() || undefined,
        activeOnly: !showInactive,
        limit: LIST_PAGE_SIZE,
        offset,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deletePrestation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["prestations"] });
      showToast("Prestation désactivée", "success");
    },
    onError: (err: unknown) => {
      showToast(err instanceof Error ? err.message : "Suppression impossible", "error");
    },
  });

  const rows = data?.prestations ?? [];
  const total = data?.total ?? 0;
  const hasActiveSearch = Boolean(search.trim()) || showInactive;

  return (
    <ListPageRoot>
      <ListPageHeader
        title="Prestations"
        description="Catalogue de services tarifés (main-d’œuvre, forfaits, déplacements…) réutilisables sur devis et factures."
        action={
          can("prestations.create") ? (
            <ListPrimaryAction href="/settings/prestations/new">
              Nouvelle prestation
            </ListPrimaryAction>
          ) : undefined
        }
      />

      <ListToolbar>
        <ListSearchField
          value={search}
          onChange={setSearch}
          placeholder="Filtrer par nom ou référence…"
        />
        <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="accent-brand-600"
          />
          Inclure inactives
        </label>
      </ListToolbar>

      {isError ? (
        <ListPageError
          error={error}
          fallbackMessage="Impossible de charger les prestations."
          onRetry={() => void refetch()}
        />
      ) : null}

      {isLoading ? (
        <ListLoadingState />
      ) : total === 0 && !hasActiveSearch ? (
        <ListEmptyState
          message="Aucune prestation pour le moment."
          action={
            can("prestations.create") ? (
              <Link
                href="/settings/prestations/new"
                className="text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium"
              >
                Créer votre première prestation
              </Link>
            ) : undefined
          }
        />
      ) : rows.length === 0 ? (
        <ListNoResults message="Aucune prestation ne correspond à ce filtre." />
      ) : (
        <ListPagination
          offset={offset}
          limit={LIST_PAGE_SIZE}
          total={total}
          onOffsetChange={setOffset}
        >
          <ListTableShell
            gridTemplateClass={GRID}
            headerCells={
              <>
                <span>Nom</span>
                <span>Référence</span>
                <span>Tarif HT</span>
                <span>TVA</span>
                <span>Unité</span>
                <span>Actions</span>
              </>
            }
          >
            {rows.map((row) => (
              <div
                key={row.id}
                className={`grid grid-cols-1 gap-1 border-b border-slate-100 dark:border-slate-800 px-3 py-2.5 text-sm ${GRID}`}
              >
                <ListCellPrimary>
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <span className="truncate">{row.name}</span>
                    <TestDataBadgeIf isTestData={row.isTestData} />
                    {!row.isActive ? (
                      <span className="text-[10px] uppercase text-slate-400">Inactive</span>
                    ) : null}
                  </span>
                </ListCellPrimary>
                <ListCellDefault>{row.reference}</ListCellDefault>
                <ListCellDefault>
                  {row.defaultPrice.toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </ListCellDefault>
                <ListCellMuted>{row.defaultTvaRate} %</ListCellMuted>
                <ListCellMuted>{row.unit}</ListCellMuted>
                <div className="flex flex-wrap gap-2 items-center">
                  <PermissionGate permission="prestations.update">
                    <Link
                      href={`/settings/prestations/${row.id}/edit`}
                      className="text-xs font-medium text-brand-600 hover:text-brand-500"
                    >
                      Modifier
                    </Link>
                  </PermissionGate>
                  {row.isActive ? (
                    <PermissionGate permission="prestations.delete">
                      <button
                        type="button"
                        onClick={() => {
                          void confirm({
                            title: "Désactiver cette prestation ?",
                            description: `« ${row.name} » ne sera plus proposée dans l’autocomplete.`,
                            confirmLabel: "Désactiver",
                            variant: "danger",
                          }).then((ok) => {
                            if (ok) deleteMutation.mutate(row.id);
                          });
                        }}
                        className="text-xs font-medium text-red-600 hover:text-red-500"
                      >
                        Désactiver
                      </button>
                    </PermissionGate>
                  ) : null}
                </div>
              </div>
            ))}
          </ListTableShell>
        </ListPagination>
      )}
    </ListPageRoot>
  );
}
