"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as customersApi from "@/lib/customers.api";
import type { CustomerResponse } from "@syncora/shared";
import { CUSTOMER_KIND_LABELS } from "./customer-kind-labels";
import {
  filterListItems,
  ListCellDefault,
  ListCellMuted,
  ListCellPrimary,
  ListEmptyState,
  ListLoadingState,
  ListNoResults,
  ListPageError,
  ListPageHeader,
  ListPageRoot,
  ListPrimaryAction,
  ListRowLink,
  ListSearchField,
  ListTableShell,
  ListToolbar
} from "@/components/ui/list-page";

const GRID = "md:grid-cols-[1.2fr_0.7fr_1.1fr]";

export function CustomersListPage() {
  const [search, setSearch] = useState("");

  const { data: rows = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["customers", "list"],
    queryFn: () => customersApi.listCustomers(),
    staleTime: 20_000
  });

  const filtered = useMemo(
    () =>
      filterListItems(rows, search, (c: CustomerResponse) => [
        c.displayName,
        CUSTOMER_KIND_LABELS[c.kind] ?? c.kind,
        c.email,
        c.phone,
        c.mobile,
        c.companyName,
        c.legalIdentifier
      ]),
    [rows, search]
  );

  return (
    <ListPageRoot>
      <ListPageHeader
        title="Clients"
        description="Personnes physiques et morales réutilisables pour vos dossiers."
        action={<ListPrimaryAction href="/customers/new">Nouveau client</ListPrimaryAction>}
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
          message={error instanceof Error ? error.message : "Impossible de charger les clients."}
          onRetry={() => void refetch()}
        />
      ) : null}

      {isLoading ? (
        <ListLoadingState />
      ) : rows.length === 0 ? (
        <ListEmptyState message="Aucun client pour le moment." />
      ) : filtered.length === 0 ? (
        <ListNoResults message="Aucun client ne correspond à ce filtre." />
      ) : (
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
          {filtered.map((c) => (
            <ListRowLink key={c.id} href={`/customers/${c.id}`} gridTemplateClass={GRID}>
              <ListCellPrimary>{c.displayName}</ListCellPrimary>
              <ListCellDefault>{CUSTOMER_KIND_LABELS[c.kind] ?? c.kind}</ListCellDefault>
              <ListCellMuted>{[c.email, c.phone ?? c.mobile].filter(Boolean).join(" · ") || "—"}</ListCellMuted>
            </ListRowLink>
          ))}
        </ListTableShell>
      )}
    </ListPageRoot>
  );
}
