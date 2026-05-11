"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type {
  TeamResponse,
  TechnicianResponse,
  AgenceResponse,
  VehicleResponse,
  TeamStatus
} from "@syncora/shared";

const TEAM_STATUSES: TeamStatus[] = ["active", "inactive"];
import * as fleetApi from "@/lib/fleet.api";
import { normalizeCalendarColorHex } from "@/lib/team-calendar-colors";
import { useToast } from "@/components/ui/ToastProvider";
import { useRouter } from "next/navigation";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  inactive: "Inactive"
};

export function TeamDetailsPage({ teamId }: { teamId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [team, setTeam] = useState<TeamResponse | null>(null);
  const [technicians, setTechnicians] = useState<TechnicianResponse[]>([]);
  const [agences, setAgences] = useState<AgenceResponse[]>([]);
  const [vehicles, setVehicles] = useState<VehicleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editName, setEditName] = useState("");
  const [editAgenceId, setEditAgenceId] = useState("");
  const [editStatus, setEditStatus] = useState<TeamStatus>("active");
  /** Vide = couleur automatique sur le calendrier */
  const [editCalendarColor, setEditCalendarColor] = useState("");

  const [addTechnicianId, setAddTechnicianId] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [teamData, techList, agenceList, vehicleList] = await Promise.all([
        fleetApi.getTeam(teamId),
        fleetApi.listTechnicians(),
        fleetApi.listAgences(),
        fleetApi.listVehicles()
      ]);
      setTeam(teamData);
      setTechnicians(techList);
      setAgences(agenceList);
      setVehicles(vehicleList.filter((v) => v.assignedTeamId === teamId));

      setEditName(teamData.name);
      setEditAgenceId(teamData.agenceId ?? "");
      setEditStatus(teamData.status);
      setEditCalendarColor(teamData.calendarColor ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleSave = async () => {
    if (!team) return;
    setSaving(true);
    setError(null);
    try {
      await fleetApi.updateTeam(team.id, {
        name: editName.trim(),
        agenceId: editAgenceId || null,
        status: editStatus,
        calendarColor: editCalendarColor.trim() ? editCalendarColor.trim() : null
      });
      showToast("Équipe mise à jour.");
      setIsEditing(false);
      void queryClient.invalidateQueries({ queryKey: ["fleet-teams"] });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de sauvegarder");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!team || !confirm("Supprimer cette équipe ?")) return;
    try {
      await fleetApi.deleteTeam(team.id);
      showToast("Équipe supprimée.");
      router.push("/fleet/teams");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de supprimer");
    }
  };

  const handleAddMember = async () => {
    if (!team || !addTechnicianId) return;
    setSaving(true);
    setError(null);
    try {
      await fleetApi.addTeamMember(team.id, addTechnicianId);
      showToast("Technicien ajouté à l'équipe.");
      setAddTechnicianId("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d'ajouter le membre");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (technicianId: string) => {
    if (!team) return;
    setSaving(true);
    setError(null);
    try {
      await fleetApi.removeTeamMember(team.id, technicianId);
      showToast("Technicien retiré de l'équipe.");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de retirer le membre");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-sm text-slate-500 dark:text-slate-400">
        Chargement...
      </div>
    );
  }

  if (!team) {
    return (
      <div className="space-y-3">
        <p className="text-slate-700 dark:text-slate-200">Équipe introuvable.</p>
        <Link href="/fleet/teams" className="text-brand-600 dark:text-brand-400 hover:underline">
          Retour à la liste
        </Link>
      </div>
    );
  }

  const memberTechnicians = technicians.filter((t) =>
    team.technicianIds.includes(t.id)
  );
  const availableTechnicians = technicians.filter(
    (t) => !team.technicianIds.includes(t.id)
  );
  const agence = agences.find((a) => a.id === team.agenceId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold mb-1">{team.name}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Fiche équipe
            {agence ? ` — ${agence.name}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsEditing((p) => !p)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {isEditing ? "Annuler" : "Modifier"}
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            Supprimer
          </button>
          <Link
            href="/fleet/teams"
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Retour
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {error}
        </div>
      )}

      {!isEditing ? (
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <h2 className="font-semibold mb-3">Informations</h2>
          <div className="grid gap-3 md:grid-cols-2 text-sm">
            <div>
              <span className="text-slate-400 dark:text-slate-500">Nom</span>
              <p className="font-medium">{team.name}</p>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500">Agence</span>
              <p>{agence ? agence.name : "—"}</p>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500">Statut</span>
              <p>
                <span
                  className={`inline-flex rounded border px-2 py-0.5 text-xs ${STATUS_COLORS[team.status] ?? "bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700"}`}
                >
                  {STATUS_LABELS[team.status] ?? team.status}
                </span>
              </p>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500">Nombre de membres</span>
              <p>{team.technicianIds.length}</p>
            </div>
            <div className="md:col-span-2">
              <span className="text-slate-400 dark:text-slate-500">Couleur au calendrier</span>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                {team.calendarColor && normalizeCalendarColorHex(team.calendarColor) ? (
                  <>
                    <span
                      className="team-cal-legend-swatch h-6 w-10 rounded border shrink-0"
                      style={
                        {
                          "--team-cal-border": normalizeCalendarColorHex(team.calendarColor) ?? team.calendarColor
                        } as React.CSSProperties
                      }
                    />
                    <code className="text-xs text-slate-600 dark:text-slate-300">
                      {normalizeCalendarColorHex(team.calendarColor)}
                    </code>
                  </>
                ) : (
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Automatique (couleur dérivée de l&apos;équipe sur le calendrier)
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-4">
          <h2 className="font-semibold">Modifier l&apos;équipe</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">Nom</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">Statut</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as TeamStatus)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100"
              >
                {TEAM_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s === "active" ? "Active" : "Inactive"}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">Agence</label>
            <select
              value={editAgenceId}
              onChange={(e) => setEditAgenceId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100"
            >
              <option value="">Aucune agence</option>
              {agences.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.city ? ` — ${a.city}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 p-3 space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Couleur au calendrier
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Utilisée pour les interventions assignées à cette équipe. Laissez vide pour une couleur automatique.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="color"
                aria-label="Choix de la couleur"
                className="h-10 w-14 cursor-pointer rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                value={normalizeCalendarColorHex(editCalendarColor) ?? "#94a3b8"}
                onChange={(e) => setEditCalendarColor(e.target.value)}
              />
              <input
                type="text"
                placeholder="#RRGGBB"
                value={editCalendarColor}
                onChange={(e) => setEditCalendarColor(e.target.value)}
                className="flex-1 min-w-[120px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono text-slate-900 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => setEditCalendarColor("")}
                className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Automatique
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-4">
        <h2 className="font-semibold">Membres de l&apos;équipe</h2>
        {memberTechnicians.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Aucun membre dans cette équipe.</p>
        ) : (
          <div className="space-y-2">
            {memberTechnicians.map((tech) => (
              <div
                key={tech.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-sm"
              >
                <Link
                  href={`/fleet/technicians/${tech.id}`}
                  className="font-medium text-brand-600 dark:text-brand-400 hover:underline"
                >
                  {tech.firstName} {tech.lastName}
                </Link>
                <div className="flex items-center gap-3">
                  {tech.speciality && (
                    <span className="text-slate-400 dark:text-slate-500 text-xs">({tech.speciality})</span>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleRemoveMember(tech.id)}
                    disabled={saving}
                    className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Retirer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {availableTechnicians.length > 0 && (
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm text-slate-500 dark:text-slate-400 mb-1">
                Ajouter un technicien
              </label>
              <select
                value={addTechnicianId}
                onChange={(e) => setAddTechnicianId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-slate-100"
              >
                <option value="">Sélectionner un technicien</option>
                {availableTechnicians.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.firstName} {tech.lastName}
                    {tech.speciality ? ` (${tech.speciality})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => void handleAddMember()}
              disabled={saving || !addTechnicianId}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50"
            >
              Ajouter
            </button>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3">
        <h2 className="font-semibold">Véhicules affectés</h2>
        {vehicles.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Aucun véhicule affecté à cette équipe.</p>
        ) : (
          <div className="space-y-2">
            {vehicles.map((vehicle) => (
              <Link
                key={vehicle.id}
                href={`/fleet/vehicles/${vehicle.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-sm hover:bg-slate-100 dark:bg-slate-800 transition"
              >
                <div>
                  <span className="font-medium text-brand-600 dark:text-brand-400">
                    {vehicle.registrationNumber}
                  </span>
                  <span className="ml-2 text-slate-500 dark:text-slate-400">
                    {[vehicle.brand, vehicle.model].filter(Boolean).join(" ") || vehicle.type}
                  </span>
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500">{vehicle.status}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
