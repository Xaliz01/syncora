"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as customersApi from "@/lib/customers.api";
import { TestDataBadgeIf } from "@/components/test-data/TestDataBadge";
import { CUSTOMER_KIND_LABELS } from "./customer-kind-labels";
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
import { ExportButton } from "@/components/ui/ExportButton";
import * as exportsApi from "@/lib/exports.api";

const GRID = "md:grid-cols-[1.2fr_0.7fr_1.1fr]";

export function CustomersListPage() {
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    setOffset(0);
  }, [search]);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["customers", "list", search, offset],
    queryFn: () =>
      customersApi.listCustomers({
        search: search.trim() || undefined,
        limit: LIST_PAGE_SIZE,
        offset,
      }),
    staleTime: 20_000,
  });

  const rows = data?.customers ?? [];
  const total = data?.total ?? 0;
  const hasActiveSearch = Boolean(search.trim());

  return (
    <ListPageRoot>
      <ListPageHeader
        title="Clients"
        description="Personnes physiques et morales réutilisables pour vos dossiers."
        action={
          <div className="flex items-center gap-2">
            <PermissionGate permission="exports.customers">
              <ExportButton onExport={(format) => exportsApi.exportCustomersList(format)} />
            </PermissionGate>
            <PermissionGate permission="customers.create">
              <ListPrimaryAction href="/customers/new">Nouveau client</ListPrimaryAction>
            </PermissionGate>
          </div>
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
          fallbackMessage="Impossible de charger les clients."
          onRetry={() => void refetch()}
        />
      ) : null}

      {isLoading ? (
        <ListLoadingState />
      ) : total === 0 && !hasActiveSearch ? (
        <ListEmptyState message="Aucun client pour le moment." />
      ) : rows.length === 0 ? (
        <ListNoResults message="Aucun client ne correspond à ce filtre." />
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
            {rows.map((c) => (
              <ListRowLink key={c.id} href={`/customers/${c.id}`} gridTemplateClass={GRID}>
                <ListCellPrimary>
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <span className="truncate">{c.displayName}</span>
                    <TestDataBadgeIf isTestData={c.isTestData} />
                  </span>
                </ListCellPrimary>
                <ListCellDefault>{CUSTOMER_KIND_LABELS[c.kind] ?? c.kind}</ListCellDefault>
                <ListCellMuted>
                  {[c.email, c.phone ?? c.mobile].filter(Boolean).join(" · ") || "—"}
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
