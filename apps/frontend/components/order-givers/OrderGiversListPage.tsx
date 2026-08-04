"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as orderGiversApi from "@/lib/order-givers.api";
import { TestDataBadgeIf } from "@/components/test-data/TestDataBadge";
import { CUSTOMER_KIND_LABELS } from "@/components/customers/customer-kind-labels";
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
  ListRowLink,
  ListSearchField,
  ListTableShell,
  ListToolbar,
} from "@/components/ui/list-page";
import { PermissionGate } from "@/components/auth/PermissionGate";

const GRID = "md:grid-cols-[1.2fr_0.7fr_1.1fr]";

export function OrderGiversListPage() {
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    setOffset(0);
  }, [search]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["order-givers", "list", search, offset],
    queryFn: () =>
      orderGiversApi.listOrderGivers({
        search: search.trim() || undefined,
        limit: LIST_PAGE_SIZE,
        offset,
      }),
    staleTime: 20_000,
  });

  const rows = data?.orderGivers ?? [];
  const total = data?.total ?? 0;
  const hasActiveSearch = Boolean(search.trim());

  return (
    <ListPageRoot>
      <ListPageHeader
        title="Donneurs d'ordre"
        description="Tiers facturables distincts des clients, réutilisables sur vos dossiers."
        action={
          <PermissionGate permission="order_givers.create">
            <ListPrimaryAction href="/order-givers/new">
              Nouveau donneur d&apos;ordre
            </ListPrimaryAction>
          </PermissionGate>
        }
      />

      <ListToolbar>
        <ListSearchField
          value={search}
          onChange={setSearch}
          placeholder="Filtrer par nom, type, email, téléphone…"
        />
      </ListToolbar>

      {isError ? (
        <ListPageError
          error={error}
          fallbackMessage="Impossible de charger les donneurs d'ordre."
          onRetry={() => void refetch()}
        />
      ) : null}

      {isLoading ? (
        <ListLoadingState />
      ) : total === 0 && !hasActiveSearch ? (
        <ListEmptyState message="Aucun donneur d'ordre pour le moment." />
      ) : rows.length === 0 ? (
        <ListNoResults message="Aucun donneur d'ordre ne correspond à ce filtre." />
      ) : (
        <>
          <ListTableShell
            gridTemplateClass={GRID}
            headerCells={
              <>
                <span>Nom</span>
                <span>Type</span>
                <span>Coordonnées</span>
              </>
            }
          >
            {rows.map((og) => (
              <ListRowLink key={og.id} href={`/order-givers/${og.id}`} gridTemplateClass={GRID}>
                <ListCellPrimary>
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <span className="truncate">{og.displayName}</span>
                    <TestDataBadgeIf isTestData={og.isTestData} />
                  </span>
                </ListCellPrimary>
                <ListCellDefault>{CUSTOMER_KIND_LABELS[og.kind] ?? og.kind}</ListCellDefault>
                <ListCellMuted>
                  {[og.email, og.phone ?? og.mobile].filter(Boolean).join(" · ") || "—"}
                </ListCellMuted>
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
    </ListPageRoot>
  );
}
