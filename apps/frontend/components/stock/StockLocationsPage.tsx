"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type { StockLocationType } from "@planwise/shared";
import * as stockApi from "@/lib/stock.api";
import { usePermissions } from "@/lib/hooks/usePermissions";
import {
  ListBadge,
  ListCellDefault,
  ListCellPrimary,
  ListEmptyState,
  ListLoadingState,
  ListPageHeader,
  ListPageRoot,
  ListPrimaryAction,
  ListRowLink,
  ListTableShell,
} from "@/components/ui/list-page";

const LOCATION_TYPE_LABELS: Record<StockLocationType, string> = {
  warehouse: "Entrepôt",
  agence: "Agence",
  vehicle: "Véhicule",
};

const LOCATION_TYPE_COLORS: Record<StockLocationType, string> = {
  warehouse: "bg-blue-50 text-blue-700 border-blue-200",
  agence: "bg-violet-50 text-violet-700 border-violet-200",
  vehicle: "bg-amber-50 text-amber-700 border-amber-200",
};

const GRID = "md:grid-cols-[1.2fr_0.8fr_0.8fr_1fr]";

export function StockLocationsPage() {
  const { can } = usePermissions();

  const { data: locations, isLoading } = useQuery({
    queryKey: ["stock-locations"],
    queryFn: () => stockApi.listStockLocations(),
  });

  return (
    <ListPageRoot>
      <ListPageHeader
        title="Emplacements de stock"
        description="Gérez vos entrepôts, agences et véhicules pour suivre le stock par emplacement."
        action={
          can("stock.locations.create") ? (
            <ListPrimaryAction href="/settings/stock/locations/new">
              Nouvel emplacement
            </ListPrimaryAction>
          ) : undefined
        }
      />

      {isLoading ? (
        <ListLoadingState />
      ) : !(locations ?? []).length ? (
        <ListEmptyState
          message="Aucun emplacement de stock."
          action={
            can("stock.locations.create") ? (
              <Link
                href="/settings/stock/locations/new"
                className="text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium"
              >
                Créer votre premier emplacement
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ListTableShell
          gridTemplateClass={GRID}
          headerCells={
            <>
              <span>Nom</span>
              <span>Type</span>
              <span>Référence</span>
              <span>Adresse</span>
            </>
          }
        >
          {locations!.map((loc) => (
            <ListRowLink
              key={loc.id}
              href={`/settings/stock/locations/${loc.id}`}
              gridTemplateClass={GRID}
            >
              <ListCellPrimary>
                {loc.name}
                {loc.isDefault && <span className="ml-2 text-xs text-slate-400">(par défaut)</span>}
              </ListCellPrimary>
              <ListBadge className={LOCATION_TYPE_COLORS[loc.type]}>
                {LOCATION_TYPE_LABELS[loc.type]}
              </ListBadge>
              <ListCellDefault className="text-xs text-slate-500">
                {loc.referenceName ?? loc.referenceId ?? "—"}
              </ListCellDefault>
              <ListCellDefault className="text-xs text-slate-500">
                {loc.address ?? "—"}
              </ListCellDefault>
            </ListRowLink>
          ))}
        </ListTableShell>
      )}
    </ListPageRoot>
  );
}
