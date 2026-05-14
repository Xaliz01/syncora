"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { TeamResponse } from "@syncora/shared";
import * as fleetApi from "@/lib/fleet.api";
import {
  filterListItems,
  ListBadge,
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
  ListToolbar,
} from "@/components/ui/list-page";
import { PermissionGate } from "@/components/auth/PermissionGate";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive:
    "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
};

const GRID = "md:grid-cols-[1.5fr_1fr_0.5fr_0.5fr]";

export function TeamsListPage() {
  const [teams, setTeams] = useState<TeamResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fleetApi.listTeams();
      setTeams(data);
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
      filterListItems(teams, search, (team) => [
        team.name,
        team.agenceName,
        STATUS_LABELS[team.status] ?? team.status,
        String(team.technicianIds.length),
      ]),
    [teams, search],
  );

  return (
    <ListPageRoot>
      <ListPageHeader
        title="Équipes"
        description="Gérez les équipes de techniciens de votre organisation."
        action={<PermissionGate permission="teams.create"><ListPrimaryAction href="/fleet/teams/new">Créer une équipe</ListPrimaryAction></PermissionGate>}
      />

      {error ? <ListPageError message={error} onRetry={() => void loadData()} /> : null}

      <ListToolbar>
        <ListSearchField
          value={search}
          onChange={setSearch}
          placeholder="Filtrer par nom, agence, statut…"
        />
      </ListToolbar>

      {loading ? (
        <ListLoadingState />
      ) : teams.length === 0 ? (
        <ListEmptyState
          message="Aucune équipe enregistrée."
          action={
            <PermissionGate permission="teams.create">
              <Link
              href="/fleet/teams/new"
              className="text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium"
            >
                Créer votre première équipe
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
              <span>Agence</span>
              <span>Membres</span>
              <span>Statut</span>
            </>
          }
        >
          {filtered.map((team) => (
            <ListRowLink key={team.id} href={`/fleet/teams/${team.id}`} gridTemplateClass={GRID}>
              <ListCellPrimary>{team.name}</ListCellPrimary>
              <ListCellMuted>{team.agenceName || "—"}</ListCellMuted>
              <ListCellDefault>{team.technicianIds.length}</ListCellDefault>
              <ListBadge
                className={
                  STATUS_COLORS[team.status] ??
                  "bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                }
              >
                {STATUS_LABELS[team.status] ?? team.status}
              </ListBadge>
            </ListRowLink>
          ))}
        </ListTableShell>
      )}
    </ListPageRoot>
  );
}
