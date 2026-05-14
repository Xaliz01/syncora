"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { TechnicianResponse } from "@syncora/shared";
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
  actif: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactif:
    "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700",
};

const STATUS_LABELS: Record<string, string> = {
  actif: "Actif",
  inactif: "Inactif",
};

const GRID = "md:grid-cols-[1.2fr_1fr_0.8fr_0.5fr]";

export function TechniciansListPage() {
  const [technicians, setTechnicians] = useState<TechnicianResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fleetApi.listTechnicians();
      setTechnicians(data);
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
      filterListItems(technicians, search, (tech) => [
        tech.firstName,
        tech.lastName,
        `${tech.firstName} ${tech.lastName}`,
        tech.email,
        tech.speciality,
        STATUS_LABELS[tech.status] ?? tech.status,
      ]),
    [technicians, search],
  );

  return (
    <ListPageRoot>
      <ListPageHeader
        title="Techniciens"
        description="Profils terrain et comptes utilisateur associés."
        action={
          <PermissionGate permission="fleet.technicians.create"><ListPrimaryAction href="/fleet/technicians/new">Ajouter un technicien</ListPrimaryAction></PermissionGate>
        }
      />

      {error ? <ListPageError message={error} onRetry={() => void loadData()} /> : null}

      <ListToolbar>
        <ListSearchField
          value={search}
          onChange={setSearch}
          placeholder="Filtrer par nom, email, spécialité…"
        />
      </ListToolbar>

      {loading ? (
        <ListLoadingState />
      ) : technicians.length === 0 ? (
        <ListEmptyState
          message="Aucun technicien enregistré."
          action={
            <PermissionGate permission="fleet.technicians.create">
              <Link
              href="/fleet/technicians/new"
              className="text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium"
            >
                Ajouter votre premier technicien
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
              <span>Email</span>
              <span>Spécialité</span>
              <span>Statut</span>
            </>
          }
        >
          {filtered.map((tech) => (
            <ListRowLink
              key={tech.id}
              href={`/fleet/technicians/${tech.id}`}
              gridTemplateClass={GRID}
            >
              <ListCellPrimary>
                {tech.firstName} {tech.lastName}
              </ListCellPrimary>
              <ListCellMuted>{tech.email || "—"}</ListCellMuted>
              <ListCellDefault>{tech.speciality || "—"}</ListCellDefault>
              <ListBadge
                className={
                  STATUS_COLORS[tech.status] ??
                  "bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                }
              >
                {STATUS_LABELS[tech.status] ?? tech.status}
              </ListBadge>
            </ListRowLink>
          ))}
        </ListTableShell>
      )}
    </ListPageRoot>
  );
}
