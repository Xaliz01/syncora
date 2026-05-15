"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { VehicleResponse } from "@syncora/shared";
import * as fleetApi from "@/lib/fleet.api";
import {
  filterListItems,
  ListBadge,
  ListCellDefault,
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
  maintenance: "bg-amber-50 text-amber-700 border-amber-200",
  hors_service: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_LABELS: Record<string, string> = {
  actif: "Actif",
  maintenance: "Maintenance",
  hors_service: "Hors service",
};

const GRID = "md:grid-cols-[1fr_1fr_0.8fr_0.6fr_0.6fr]";

export function VehiclesListPage() {
  const [vehicles, setVehicles] = useState<VehicleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fleetApi.listVehicles();
      setVehicles(data);
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
      filterListItems(vehicles, search, (v) => [
        v.registrationNumber,
        v.brand,
        v.model,
        v.type,
        v.mileage != null ? `${v.mileage} km` : "",
        STATUS_LABELS[v.status] ?? v.status,
      ]),
    [vehicles, search],
  );

  return (
    <ListPageRoot>
      <ListPageHeader
        title="Véhicules"
        description="Flotte de véhicules de l'organisation. Cliquez sur un véhicule pour voir sa fiche."
        action={
          <PermissionGate permission="fleet.vehicles.create">
            <ListPrimaryAction href="/fleet/vehicles/new">Ajouter un véhicule</ListPrimaryAction>
          </PermissionGate>
        }
      />

      {error ? <ListPageError message={error} onRetry={() => void loadData()} /> : null}

      <ListToolbar>
        <ListSearchField
          value={search}
          onChange={setSearch}
          placeholder="Filtrer par immatriculation, marque, type, statut…"
        />
      </ListToolbar>

      {loading ? (
        <ListLoadingState />
      ) : vehicles.length === 0 ? (
        <ListEmptyState
          message="Aucun véhicule enregistré."
          action={
            <PermissionGate permission="fleet.vehicles.create">
              <Link
                href="/fleet/vehicles/new"
                className="text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium"
              >
                Ajouter votre premier véhicule
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
              <span>Immatriculation</span>
              <span>Marque / Modèle</span>
              <span>Type</span>
              <span>Kilométrage</span>
              <span>Statut</span>
            </>
          }
        >
          {filtered.map((vehicle) => (
            <ListRowLink
              key={vehicle.id}
              href={`/fleet/vehicles/${vehicle.id}`}
              gridTemplateClass={GRID}
            >
              <ListCellPrimary>{vehicle.registrationNumber}</ListCellPrimary>
              <ListCellDefault>
                {[vehicle.brand, vehicle.model].filter(Boolean).join(" ") || "—"}
              </ListCellDefault>
              <ListCellDefault className="capitalize">{vehicle.type}</ListCellDefault>
              <ListCellDefault>
                {vehicle.mileage != null ? `${vehicle.mileage.toLocaleString("fr-FR")} km` : "—"}
              </ListCellDefault>
              <ListBadge
                className={
                  STATUS_COLORS[vehicle.status] ??
                  "bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                }
              >
                {STATUS_LABELS[vehicle.status] ?? vehicle.status}
              </ListBadge>
            </ListRowLink>
          ))}
        </ListTableShell>
      )}
    </ListPageRoot>
  );
}
