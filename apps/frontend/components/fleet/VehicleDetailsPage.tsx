"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import type { VehicleResponse, TeamResponse } from "@planwise/shared";
import * as fleetApi from "@/lib/fleet.api";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { useRouter } from "next/navigation";
import { DocumentUploadZone } from "@/components/documents/DocumentUploadZone";
import { AppErrorAlert, ResourceNotFoundPanel } from "@/components/ui/AppErrorAlert";
import { PageBreadcrumb } from "@/components/ui/FormDialog";

const TYPE_LABELS: Record<string, string> = {
  camion: "Camion",
  camionnette: "Camionnette",
  voiture: "Voiture",
  utilitaire: "Utilitaire",
  fourgon: "Fourgon",
  remorque: "Remorque",
  autre: "Autre",
};

const STATUS_LABELS: Record<string, string> = {
  actif: "Actif",
  maintenance: "Maintenance",
  hors_service: "Hors service",
};

const STATUS_COLORS: Record<string, string> = {
  actif: "bg-emerald-50 text-emerald-700 border-emerald-200",
  maintenance: "bg-amber-50 text-amber-700 border-amber-200",
  hors_service: "bg-red-50 text-red-700 border-red-200",
};

export function VehicleDetailsPage({ vehicleId }: { vehicleId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { can } = usePermissions();
  const [vehicle, setVehicle] = useState<VehicleResponse | null>(null);
  const [teams, setTeams] = useState<TeamResponse[]>([]);
  const [assignedTeam, setAssignedTeam] = useState<TeamResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [selectedTeamId, setSelectedTeamId] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [vehicleData, teamList] = await Promise.all([
        fleetApi.getVehicle(vehicleId),
        fleetApi.listTeams(),
      ]);
      setVehicle(vehicleData);
      setTeams(teamList);

      if (vehicleData.assignedTeamId) {
        const team = teamList.find((t) => t.id === vehicleData.assignedTeamId) ?? null;
        setAssignedTeam(team);
        setSelectedTeamId(vehicleData.assignedTeamId);
      } else {
        setAssignedTeam(null);
        setSelectedTeamId("");
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleAssignTeam = async () => {
    if (!vehicle || !selectedTeamId) return;
    setSaving(true);
    setError(null);
    try {
      await fleetApi.assignTeamToVehicle(vehicle.id, selectedTeamId);
      showToast("Équipe affectée au véhicule.");
      await refresh();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleUnassignTeam = async () => {
    if (!vehicle) return;
    setSaving(true);
    setError(null);
    try {
      await fleetApi.unassignTeamFromVehicle(vehicle.id);
      showToast("Équipe désaffectée.");
      await refresh();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!vehicle) return;
    const ok = await confirm({
      title: "Supprimer ce véhicule ?",
      description: "La fiche véhicule et l’historique d’affectation seront supprimés.",
      confirmLabel: "Supprimer",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await fleetApi.deleteVehicle(vehicle.id);
      showToast("Véhicule supprimé.");
      router.push("/fleet/vehicles");
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

  if (!vehicle) {
    return (
      <ResourceNotFoundPanel
        error={error}
        resourceLabel="Véhicule"
        backHref="/fleet/vehicles"
        backLabel="Retour à la liste"
        onRetry={() => void refresh()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageBreadcrumb href="/fleet/vehicles" label="Véhicules" />
        <div className="flex items-center gap-2">
          {can("fleet.vehicles.update") && (
            <Link
              href={`/fleet/vehicles/${vehicle.id}/edit`}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Modifier
            </Link>
          )}
          {can("fleet.vehicles.delete") && (
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
        <h1 className="text-xl sm:text-2xl font-semibold mb-1">{vehicle.registrationNumber}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {TYPE_LABELS[vehicle.type] ?? vehicle.type}
          {vehicle.brand ? ` — ${vehicle.brand}` : ""}
          {vehicle.model ? ` ${vehicle.model}` : ""}
        </p>
      </div>

      {error ? <AppErrorAlert error={error} onRetry={() => void refresh()} /> : null}

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
        <h2 className="font-semibold mb-3">Informations du véhicule</h2>
        <div className="grid gap-3 md:grid-cols-2 text-sm">
          <div>
            <span className="text-slate-400 dark:text-slate-500">Immatriculation</span>
            <p className="font-medium">{vehicle.registrationNumber}</p>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500">Type</span>
            <p>{TYPE_LABELS[vehicle.type] ?? vehicle.type}</p>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500">Marque</span>
            <p>{vehicle.brand || "—"}</p>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500">Modèle</span>
            <p>{vehicle.model || "—"}</p>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500">Année</span>
            <p>{vehicle.year ?? "—"}</p>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500">Couleur</span>
            <p>{vehicle.color || "—"}</p>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500">VIN</span>
            <p className="font-mono text-xs">{vehicle.vin || "—"}</p>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500">Kilométrage</span>
            <p>{vehicle.mileage != null ? `${vehicle.mileage.toLocaleString("fr-FR")} km` : "—"}</p>
          </div>
          <div>
            <span className="text-slate-400 dark:text-slate-500">Statut</span>
            <p>
              <span
                className={`inline-flex rounded border px-2 py-0.5 text-xs ${STATUS_COLORS[vehicle.status] ?? "bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"}`}
              >
                {STATUS_LABELS[vehicle.status] ?? vehicle.status}
              </span>
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-4">
        <h2 className="font-semibold">Équipe affectée</h2>
        {assignedTeam ? (
          <div className="flex items-center justify-between">
            <div>
              <Link
                href={`/fleet/teams/${assignedTeam.id}`}
                className="font-medium text-brand-600 dark:text-brand-400 hover:text-brand-500 hover:underline"
              >
                {assignedTeam.name}
              </Link>
              <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">
                ({assignedTeam.technicianIds.length} membre
                {assignedTeam.technicianIds.length !== 1 ? "s" : ""})
              </span>
            </div>
            {can("fleet.vehicles.assign") && (
              <button
                type="button"
                onClick={() => void handleUnassignTeam()}
                disabled={saving}
                className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Désaffecter
              </button>
            )}
          </div>
        ) : can("fleet.vehicles.assign") ? (
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">
                Affecter une équipe
              </label>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100"
              >
                <option value="">Sélectionner une équipe</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                    {team.agenceName ? ` (${team.agenceName})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => void handleAssignTeam()}
              disabled={saving || !selectedTeamId}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
            >
              Affecter
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">Aucune équipe affectée.</p>
        )}
      </section>

      <DocumentUploadZone entityType="vehicle" entityId={vehicleId} />
    </div>
  );
}
