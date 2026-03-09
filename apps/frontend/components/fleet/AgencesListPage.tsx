"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import type { AgenceResponse } from "@syncora/shared";
import * as fleetApi from "@/lib/fleet.api";

export function AgencesListPage() {
  const [agences, setAgences] = useState<AgenceResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Agences</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gérez les agences (sites, bases) de votre organisation.
          </p>
        </div>
        <Link
          href="/fleet/agences/new"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 transition self-start flex-shrink-0"
        >
          Ajouter une agence
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
      ) : agences.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-sm text-slate-500 mb-3">Aucune agence enregistrée.</p>
          <Link
            href="/fleet/agences/new"
            className="text-sm text-brand-600 hover:underline font-medium"
          >
            Ajouter votre première agence
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="hidden md:grid md:grid-cols-[1.5fr_1fr_0.8fr_0.8fr] gap-3 border-b border-slate-200 px-4 py-3 text-xs uppercase tracking-wide text-slate-400">
            <span>Nom</span>
            <span>Ville</span>
            <span>Code postal</span>
            <span>Téléphone</span>
          </div>
          {agences.map((agence) => (
            <Link
              key={agence.id}
              href={`/fleet/agences/${agence.id}`}
              className="grid md:grid-cols-[1.5fr_1fr_0.8fr_0.8fr] gap-2 md:gap-3 items-center px-4 py-3 border-b border-slate-200 last:border-b-0 hover:bg-slate-50 transition"
            >
              <span className="font-medium text-brand-600">{agence.name}</span>
              <span className="text-sm text-slate-500">{agence.city || "—"}</span>
              <span className="text-sm text-slate-500">{agence.postalCode || "—"}</span>
              <span className="text-sm text-slate-500">{agence.phone || "—"}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
