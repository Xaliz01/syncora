"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import type { TeamResponse } from "@syncora/shared";
import * as fleetApi from "@/lib/fleet.api";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive: "bg-slate-100 text-slate-500 border-slate-200"
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  inactive: "Inactive"
};

export function TeamsListPage() {
  const [teams, setTeams] = useState<TeamResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Équipes</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gérez les équipes de techniciens de votre organisation.
          </p>
        </div>
        <Link
          href="/fleet/teams/new"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 transition self-start flex-shrink-0"
        >
          Créer une équipe
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
      ) : teams.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-sm text-slate-500 mb-3">Aucune équipe enregistrée.</p>
          <Link
            href="/fleet/teams/new"
            className="text-sm text-brand-600 hover:underline font-medium"
          >
            Créer votre première équipe
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="hidden md:grid md:grid-cols-[1.5fr_1fr_0.5fr_0.5fr] gap-3 border-b border-slate-200 px-4 py-3 text-xs uppercase tracking-wide text-slate-400">
            <span>Nom</span>
            <span>Agence</span>
            <span>Membres</span>
            <span>Statut</span>
          </div>
          {teams.map((team) => (
            <Link
              key={team.id}
              href={`/fleet/teams/${team.id}`}
              className="grid md:grid-cols-[1.5fr_1fr_0.5fr_0.5fr] gap-2 md:gap-3 items-center px-4 py-3 border-b border-slate-200 last:border-b-0 hover:bg-slate-50 transition"
            >
              <span className="font-medium text-brand-600">{team.name}</span>
              <span className="text-sm text-slate-500 truncate">
                {team.agenceName || "—"}
              </span>
              <span className="text-sm text-slate-600">{team.technicianIds.length}</span>
              <span
                className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-xs ${STATUS_COLORS[team.status] ?? "bg-slate-50 text-slate-700 border-slate-200"}`}
              >
                {STATUS_LABELS[team.status] ?? team.status}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
