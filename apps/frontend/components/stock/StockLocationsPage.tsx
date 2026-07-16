"use client";

import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StockLocationType } from "@planwise/shared";
import * as stockApi from "@/lib/stock.api";
import * as fleetApi from "@/lib/fleet.api";
import { usePermissions } from "@/lib/hooks/usePermissions";
import {
  ListBadge,
  ListCellDefault,
  ListCellPrimary,
  ListEmptyState,
  ListLoadingState,
  ListPageError,
  ListPageHeader,
  ListPageRoot,
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

const PRIMARY_BUTTON_CLASS =
  "rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 transition self-start flex-shrink-0";

export function StockLocationsPage() {
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState("");

  const [createName, setCreateName] = useState("");
  const [createType, setCreateType] = useState<StockLocationType>("warehouse");
  const [createReferenceId, setCreateReferenceId] = useState("");
  const [createAddress, setCreateAddress] = useState("");

  const { data: locations, isLoading } = useQuery({
    queryKey: ["stock-locations"],
    queryFn: () => stockApi.listStockLocations(),
  });

  const { data: agences } = useQuery({
    queryKey: ["agences"],
    queryFn: () => fleetApi.listAgences(),
    enabled: createType === "agence" && showCreateForm,
  });

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => fleetApi.listVehicles(),
    enabled: createType === "vehicle" && showCreateForm,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["stock-locations"] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: stockApi.CreateStockLocationPayload) =>
      stockApi.createStockLocation(payload),
    onSuccess: () => {
      invalidate();
      setShowCreateForm(false);
      resetForm();
      setError("");
    },
    onError: (err: Error) => setError(err.message),
  });

  function resetForm() {
    setCreateName("");
    setCreateType("warehouse");
    setCreateReferenceId("");
    setCreateAddress("");
  }

  function handleCreate() {
    if (!createName.trim()) {
      setError("Le nom est obligatoire");
      return;
    }
    if ((createType === "agence" || createType === "vehicle") && !createReferenceId) {
      setError(createType === "agence" ? "Sélectionnez une agence" : "Sélectionnez un véhicule");
      return;
    }
    createMutation.mutate({
      name: createName.trim(),
      type: createType,
      referenceId: createReferenceId || undefined,
      address: createAddress.trim() || undefined,
    });
  }

  return (
    <ListPageRoot>
      <ListPageHeader
        title="Emplacements de stock"
        description="Gérez vos entrepôts, agences et véhicules pour suivre le stock par emplacement."
        action={
          can("stock.locations.create") ? (
            <button
              type="button"
              onClick={() => setShowCreateForm((prev) => !prev)}
              className={PRIMARY_BUTTON_CLASS}
            >
              {showCreateForm ? "Fermer" : "Nouvel emplacement"}
            </button>
          ) : undefined
        }
      />

      {error ? <ListPageError message={error} fallbackMessage="Une erreur est survenue." /> : null}

      {showCreateForm && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <h2 className="mb-3 font-semibold text-slate-900 dark:text-slate-100">
            Créer un emplacement
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Ex: Entrepôt principal"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                value={createType}
                onChange={(e) => {
                  setCreateType(e.target.value as StockLocationType);
                  setCreateReferenceId("");
                }}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
              >
                <option value="warehouse">Entrepôt</option>
                <option value="agence">Agence</option>
                <option value="vehicle">Véhicule</option>
              </select>
            </div>
            {createType === "agence" && (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Agence liée <span className="text-red-500">*</span>
                </label>
                <select
                  value={createReferenceId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setCreateReferenceId(id);
                    const agence = (agences ?? []).find((a) => a.id === id);
                    if (agence) {
                      const parts = [
                        agence.address,
                        [agence.postalCode, agence.city].filter(Boolean).join(" "),
                      ].filter((p) => p && String(p).trim().length > 0);
                      setCreateAddress(parts.join(", "));
                      if (!createName.trim()) {
                        setCreateName(agence.name);
                      }
                    }
                  }}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
                >
                  <option value="">Choisir une agence</option>
                  {(agences ?? []).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {createType === "vehicle" && (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Véhicule lié <span className="text-red-500">*</span>
                </label>
                <select
                  value={createReferenceId}
                  onChange={(e) => setCreateReferenceId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
                >
                  <option value="">Choisir un véhicule</option>
                  {(vehicles ?? []).map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registrationNumber} — {v.brand} {v.model}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
                Adresse
              </label>
              <input
                value={createAddress}
                onChange={(e) => setCreateAddress(e.target.value)}
                placeholder="Optionnel"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-3">
            <button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition"
            >
              Créer l&apos;emplacement
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <ListLoadingState />
      ) : !(locations ?? []).length ? (
        <ListEmptyState
          message="Aucun emplacement de stock."
          action={
            can("stock.locations.create") ? (
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                className="text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium"
              >
                Créer votre premier emplacement
              </button>
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
