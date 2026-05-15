"use client";

import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import type { TeamStatus, TechnicianResponse, AgenceResponse } from "@syncora/shared";
import * as fleetApi from "@/lib/fleet.api";
import { normalizeCalendarColorHex } from "@/lib/team-calendar-colors";
import { useToast } from "@/components/ui/ToastProvider";

const TEAM_STATUSES: TeamStatus[] = ["active", "inactive"];

export function TeamCreatePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [agenceId, setAgenceId] = useState("");
  const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<string[]>([]);
  const [status, setStatus] = useState<TeamStatus>("active");
  const [calendarColor, setCalendarColor] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [technicians, setTechnicians] = useState<TechnicianResponse[]>([]);
  const [agences, setAgences] = useState<AgenceResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [techList, agenceList] = await Promise.all([
        fleetApi.listTechnicians(),
        fleetApi.listAgences(),
      ]);
      setTechnicians(techList);
      setAgences(agenceList);
    } catch {
      // continue without options
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const toggleTechnician = (id: string) => {
    setSelectedTechnicianIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await fleetApi.createTeam({
        name: name.trim(),
        agenceId: agenceId || undefined,
        technicianIds: selectedTechnicianIds,
        status,
        calendarColor: calendarColor.trim() || undefined,
      });
      showToast("Équipe créée avec succès.");
      router.push("/fleet/teams");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer l'équipe");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Créer une équipe</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Définissez le nom de l&apos;équipe, rattachez-la à une agence et sélectionnez ses membres.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Nom de l&apos;équipe <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Équipe Nord"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Statut
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TeamStatus)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none"
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
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Agence
            </label>
            <select
              value={agenceId}
              onChange={(e) => setAgenceId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none"
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

          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 p-4 space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Couleur au calendrier (optionnel)
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Affichée sur les interventions assignées à cette équipe. Vide = couleur automatique.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="color"
                aria-label="Couleur calendrier"
                className="h-10 w-14 cursor-pointer rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
                value={normalizeCalendarColorHex(calendarColor) ?? "#94a3b8"}
                onChange={(e) => setCalendarColor(e.target.value)}
              />
              <input
                type="text"
                placeholder="#RRGGBB"
                value={calendarColor}
                onChange={(e) => setCalendarColor(e.target.value)}
                className="flex-1 min-w-[120px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono"
              />
              <button
                type="button"
                onClick={() => setCalendarColor("")}
                className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Automatique
              </button>
            </div>
          </div>

          {!loading && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                Membres de l&apos;équipe
              </label>
              {technicians.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  Aucun technicien disponible.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {technicians.map((tech) => (
                    <label
                      key={tech.id}
                      className={`flex items-center gap-2 rounded-lg border p-3 text-sm cursor-pointer transition ${
                        selectedTechnicianIds.includes(tech.id)
                          ? "border-brand-500 bg-brand-50"
                          : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedTechnicianIds.includes(tech.id)}
                        onChange={() => toggleTechnician(tech.id)}
                        className="accent-brand-600"
                      />
                      <span className="font-medium">
                        {tech.firstName} {tech.lastName}
                      </span>
                      {tech.speciality && (
                        <span className="text-slate-400 dark:text-slate-500 text-xs">
                          ({tech.speciality})
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition"
            >
              {saving ? "Création..." : "Créer l'équipe"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/fleet/teams")}
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Annuler
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
