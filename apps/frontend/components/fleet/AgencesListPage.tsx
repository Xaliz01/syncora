"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { AgenceResponse } from "@syncora/shared";
import * as fleetApi from "@/lib/fleet.api";
import {
  filterListItems,
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
  ListToolbar,
} from "@/components/ui/list-page";
import { PermissionGate } from "@/components/auth/PermissionGate";

const GRID = "md:grid-cols-[1.5fr_1fr_0.8fr_0.8fr]";

export function AgencesListPage() {
  const [agences, setAgences] = useState<AgenceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fleetApi.listAgences();
      setAgences(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filtered = useMemo(
    () =>
      filterListItems(agences, search, (a) => [a.name, a.city, a.postalCode, a.phone, a.address]),
    [agences, search],
  );

  return (
    <ListPageRoot>
      <ListPageHeader
        title="Agences"
        description="Gérez les agences (sites, bases) de votre organisation."
        action={<PermissionGate permission="agences.create"><ListPrimaryAction href="/fleet/agences/new">Ajouter une agence</ListPrimaryAction></PermissionGate>}
      />

      {error ? <ListPageError message={error} onRetry={() => void loadData()} /> : null}

      <ListToolbar>
        <ListSearchField
          value={search}
          onChange={setSearch}
          placeholder="Filtrer par nom, ville, code postal…"
        />
      </ListToolbar>

      {loading ? (
        <ListLoadingState />
      ) : agences.length === 0 ? (
        <ListEmptyState
          message="Aucune agence enregistrée."
          action={
            <PermissionGate permission="agences.create">
              <Link
              href="/fleet/agences/new"
              className="text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium"
            >
                Ajouter votre première agence
              </Link>
            </PermissionGate>
          }
        />
      ) : filtered.length === 0 ? (
        <ListNoResults />
      ) : (
        <ListTableShell
          gridTemplateClass={GRID}
          headerCells={
            <>
              <span>Nom</span>
              <span>Ville</span>
              <span>Code postal</span>
              <span>Téléphone</span>
            </>
          }
        >
          {filtered.map((agence) => (
            <ListRowLink
              key={agence.id}
              href={`/fleet/agences/${agence.id}`}
              gridTemplateClass={GRID}
            >
              <ListCellPrimary>{agence.name}</ListCellPrimary>
              <ListCellMuted>{agence.city || "—"}</ListCellMuted>
              <ListCellMuted>{agence.postalCode || "—"}</ListCellMuted>
              <ListCellMuted>{agence.phone || "—"}</ListCellMuted>
            </ListRowLink>
          ))}
        </ListTableShell>
      )}
    </ListPageRoot>
  );
}
