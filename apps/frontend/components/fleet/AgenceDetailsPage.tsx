"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import type { AgenceResponse, TeamResponse } from "@planwise/shared";
import * as fleetApi from "@/lib/fleet.api";
import { useToast } from "@/components/ui/ToastProvider";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { useRouter } from "next/navigation";
import { AppErrorAlert, ResourceNotFoundPanel } from "@/components/ui/AppErrorAlert";
import { PageBreadcrumb } from "@/components/ui/FormDialog";

export function AgenceDetailsPage({ agenceId }: { agenceId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const { can } = usePermissions();
  const [agence, setAgence] = useState<AgenceResponse | null>(null);
  const [teams, setTeams] = useState<TeamResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [agenceData, teamList] = await Promise.all([
        fleetApi.getAgence(agenceId),
        fleetApi.listTeams(),
      ]);
      setAgence(agenceData);
      setTeams(teamList.filter((t) => t.agenceId === agenceId));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [agenceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleDelete = async () => {
    if (!agence || !confirm("Supprimer cette agence ?")) return;
    try {
      await fleetApi.deleteAgence(agence.id);
      showToast("Agence supprimée.");
      router.push("/fleet/agences");
    } catch (err) {
      setError(err);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-sm text-slate-500 dark:text-slate-400">
        Chargement...
      </div>
    );
  }

  if (!agence) {
    return (
      <ResourceNotFoundPanel
        error={error}
        resourceLabel="Agence"
        backHref="/fleet/agences"
        backLabel="Retour à la liste"
        onRetry={() => void refresh()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageBreadcrumb href="/fleet/agences" label="Agences" />
        <div className="flex items-center gap-2">
          {can("agences.update") && (
            <Link
              href={`/fleet/agences/${agence.id}/edit`}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Modifier
            </Link>
          )}
          {can("agences.delete") && (
            <button
              type="button"
              onClick={() => void handleDelete()}
              className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
            >
              Supprimer
            </button>
          )}
        </div>
      </div>

      <div>
        <h1 className="text-xl sm:text-2xl font-semibold mb-1">{agence.name}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Fiche agence
          {agence.city ? ` — ${agence.city}` : ""}
        </p>
      </div>

      {error ? <AppErrorAlert error={error} onRetry={() => void refresh()} /> : null}

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <h2 className="font-semibold mb-3">Informations</h2>
        <div className="grid gap-3 md:grid-cols-2 text-sm">
          <div>
            <span className="text-slate-400 dark:text-slate-500">Nom</span>
            <p className="font-medium">{agence.name}</p>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500">Adresse</span>
            <p>{agence.address || "—"}</p>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500">Ville</span>
            <p>{agence.city || "—"}</p>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500">Code postal</span>
            <p>{agence.postalCode || "—"}</p>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500">Téléphone</span>
            <p>{agence.phone || "—"}</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3">
        <h2 className="font-semibold">Équipes rattachées</h2>
        {teams.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Aucune équipe rattachée à cette agence.
          </p>
        ) : (
          <div className="space-y-2">
            {teams.map((team) => (
              <Link
                key={team.id}
                href={`/fleet/teams/${team.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-sm hover:bg-slate-100 dark:bg-slate-800 transition"
              >
                <span className="font-medium text-brand-600 dark:text-brand-400">{team.name}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {team.technicianIds.length} membre{team.technicianIds.length !== 1 ? "s" : ""}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
