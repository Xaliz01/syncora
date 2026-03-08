"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import type { TechnicianResponse } from "@syncora/shared";
import * as fleetApi from "@/lib/fleet.api";

const STATUS_COLORS: Record<string, string> = {
  actif: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactif: "bg-slate-100 text-slate-500 border-slate-200"
};

export function TechniciansListPage() {
  const [technicians, setTechnicians] = useState<TechnicianResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Techniciens</h1>
          <p className="text-sm text-slate-500 mt-1">
            Liste des techniciens de l&apos;organisation.
          </p>
        </div>
        <Link
          href="/fleet/technicians/new"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 transition self-start flex-shrink-0"
        >
          Ajouter un technicien
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
      ) : technicians.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-sm text-slate-500 mb-3">Aucun technicien enregistré.</p>
          <Link
            href="/fleet/technicians/new"
            className="text-sm text-brand-600 hover:underline font-medium"
          >
            Ajouter votre premier technicien
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="hidden md:grid md:grid-cols-[1.2fr_1fr_0.8fr_0.5fr_0.5fr] gap-3 border-b border-slate-200 px-4 py-3 text-xs uppercase tracking-wide text-slate-400">
            <span>Nom</span>
            <span>Email</span>
            <span>Spécialité</span>
            <span>Véhicules</span>
            <span>Statut</span>
          </div>
          {technicians.map((tech) => (
            <Link
              key={tech.id}
              href={`/fleet/technicians/${tech.id}`}
              className="grid md:grid-cols-[1.2fr_1fr_0.8fr_0.5fr_0.5fr] gap-2 md:gap-3 items-center px-4 py-3 border-b border-slate-200 last:border-b-0 hover:bg-slate-50 transition"
            >
              <span className="font-medium text-brand-600">
                {tech.firstName} {tech.lastName}
              </span>
              <span className="text-sm text-slate-500 truncate">{tech.email || "—"}</span>
              <span className="text-sm text-slate-600">{tech.speciality || "—"}</span>
              <span className="text-sm text-slate-600">{tech.assignedVehicleIds.length}</span>
              <span
                className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-xs capitalize ${STATUS_COLORS[tech.status] ?? "bg-slate-50 text-slate-700 border-slate-200"}`}
              >
                {tech.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
