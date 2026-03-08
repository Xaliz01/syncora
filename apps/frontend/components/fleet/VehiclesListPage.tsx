"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import type { VehicleResponse } from "@syncora/shared";
import * as fleetApi from "@/lib/fleet.api";

const STATUS_COLORS: Record<string, string> = {
  actif: "bg-emerald-50 text-emerald-700 border-emerald-200",
  maintenance: "bg-amber-50 text-amber-700 border-amber-200",
  hors_service: "bg-red-50 text-red-700 border-red-200"
};

const STATUS_LABELS: Record<string, string> = {
  actif: "Actif",
  maintenance: "Maintenance",
  hors_service: "Hors service"
};

export function VehiclesListPage() {
  const [vehicles, setVehicles] = useState<VehicleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Véhicules</h1>
          <p className="text-sm text-slate-500 mt-1">
            Flotte de véhicules de l&apos;organisation. Cliquez sur un véhicule pour voir sa fiche.
          </p>
        </div>
        <Link
          href="/fleet/vehicles/new"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 transition self-start flex-shrink-0"
        >
          Ajouter un véhicule
        </Link>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Chargement...
        </div>
      ) : vehicles.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-sm text-slate-500 mb-3">Aucun véhicule enregistré.</p>
          <Link
            href="/fleet/vehicles/new"
            className="text-sm text-brand-600 hover:underline font-medium"
          >
            Ajouter votre premier véhicule
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="hidden md:grid md:grid-cols-[1fr_1fr_0.8fr_0.6fr_0.6fr] gap-3 border-b border-slate-200 px-4 py-3 text-xs uppercase tracking-wide text-slate-400">
            <span>Immatriculation</span>
            <span>Marque / Modèle</span>
            <span>Type</span>
            <span>Kilométrage</span>
            <span>Statut</span>
          </div>
          {vehicles.map((vehicle) => (
            <Link
              key={vehicle.id}
              href={`/fleet/vehicles/${vehicle.id}`}
              className="grid md:grid-cols-[1fr_1fr_0.8fr_0.6fr_0.6fr] gap-2 md:gap-3 items-center px-4 py-3 border-b border-slate-200 last:border-b-0 hover:bg-slate-50 transition"
            >
              <span className="font-medium text-brand-600">
                {vehicle.registrationNumber}
              </span>
              <span className="text-sm text-slate-600 truncate">
                {[vehicle.brand, vehicle.model].filter(Boolean).join(" ") || "—"}
              </span>
              <span className="text-sm text-slate-600 capitalize">{vehicle.type}</span>
              <span className="text-sm text-slate-600">
                {vehicle.mileage != null ? `${vehicle.mileage.toLocaleString("fr-FR")} km` : "—"}
              </span>
              <span
                className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-xs ${STATUS_COLORS[vehicle.status] ?? "bg-slate-50 text-slate-700 border-slate-200"}`}
              >
                {STATUS_LABELS[vehicle.status] ?? vehicle.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
