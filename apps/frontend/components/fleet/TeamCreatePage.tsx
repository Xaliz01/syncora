"use client";

import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import type { TeamStatus, TechnicianResponse, AgenceResponse } from "@planwise/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as fleetApi from "@/lib/fleet.api";
import { normalizeCalendarColorHex } from "@/lib/team-calendar-colors";
import { useToast } from "@/components/ui/ToastProvider";
import { AppErrorAlert } from "@/components/ui/AppErrorAlert";
import {
  FormDialogCancelButton,
  FormDialogPrimaryButton,
  FormDialogSection,
  FormPage,
  formFieldHintClassName,
  formFieldInputClassName,
  formFieldLabelClassName,
} from "@/components/ui/FormDialog";

const TEAM_STATUSES: TeamStatus[] = ["active", "inactive"];
const LIST_HREF = "/fleet/teams";

export function TeamFormPage({ teamId }: { teamId?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const isEdit = Boolean(teamId);
  const detailHref = teamId ? `${LIST_HREF}/${teamId}` : LIST_HREF;

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ["team", teamId],
    queryFn: () => fleetApi.getTeam(teamId!),
    enabled: isEdit,
  });

  const [name, setName] = useState("");
  const [agenceId, setAgenceId] = useState("");
  const [selectedTechnicianIds, setSelectedTechnicianIds] = useState<string[]>([]);
  const [status, setStatus] = useState<TeamStatus>("active");
  const [calendarColor, setCalendarColor] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [loadError, setLoadError] = useState<unknown>(null);

  const [technicians, setTechnicians] = useState<TechnicianResponse[]>([]);
  const [agences, setAgences] = useState<AgenceResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoadError(null);
    try {
      const [techList, agenceList] = await Promise.all([
        fleetApi.listTechnicians(),
        fleetApi.listAgences(),
      ]);
      setTechnicians(techList);
      setAgences(agenceList);
    } catch (err) {
      setLoadError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setAgenceId(existing.agenceId ?? "");
    setStatus(existing.status);
    setCalendarColor(existing.calendarColor ?? "");
  }, [existing]);

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
      if (isEdit && teamId) {
        await fleetApi.updateTeam(teamId, {
          name: name.trim(),
          agenceId: agenceId || null,
          status,
          calendarColor: calendarColor.trim() ? calendarColor.trim() : null,
        });
        showToast("Équipe mise à jour.");
        void queryClient.invalidateQueries({ queryKey: ["fleet-teams"] });
        void queryClient.invalidateQueries({ queryKey: ["team", teamId] });
        router.push(detailHref);
      } else {
        const created = await fleetApi.createTeam({
          name: name.trim(),
          agenceId: agenceId || undefined,
          technicianIds: selectedTechnicianIds,
          status,
          calendarColor: calendarColor.trim() || undefined,
        });
        showToast("Équipe créée avec succès.");
        void queryClient.invalidateQueries({ queryKey: ["fleet-teams"] });
        router.push(`${LIST_HREF}/${created.id}`);
      }
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormPage
      title={isEdit ? "Modifier l'équipe" : "Créer une équipe"}
      description={
        isEdit
          ? "Mettez à jour le nom, l'agence, le statut et la couleur calendrier de l'équipe."
          : "Définissez le nom de l'équipe, rattachez-la à une agence et sélectionnez ses membres."
      }
      breadcrumb={{
        href: isEdit ? detailHref : LIST_HREF,
        label: isEdit ? name.trim() || existing?.name || "Fiche équipe" : "Équipes",
      }}
      error={
        loadError || error ? (
          <div className="space-y-2">
            {loadError ? <AppErrorAlert error={loadError} onRetry={() => void loadData()} /> : null}
            {error ? <AppErrorAlert error={error} /> : null}
          </div>
        ) : undefined
      }
      onSubmit={handleSubmit}
      footer={
        <>
          <FormDialogCancelButton onClick={() => router.push(detailHref)} disabled={saving} />
          <FormDialogPrimaryButton type="submit" disabled={saving || (isEdit && loadingExisting)}>
            {saving ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer l'équipe"}
          </FormDialogPrimaryButton>
        </>
      }
    >
      {isEdit && loadingExisting ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Chargement…</p>
      ) : (
        <>
          <FormDialogSection title="Informations générales">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={formFieldLabelClassName}>
                  Nom de l&apos;équipe <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Équipe Nord"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className={formFieldInputClassName}
                />
              </div>
              <div>
                <label className={formFieldLabelClassName}>Statut</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TeamStatus)}
                  className={formFieldInputClassName}
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
              <label className={formFieldLabelClassName}>Agence</label>
              <select
                value={agenceId}
                onChange={(e) => setAgenceId(e.target.value)}
                className={formFieldInputClassName}
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
          </FormDialogSection>

          <FormDialogSection title="Calendrier">
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 p-4 space-y-2">
              <label className={formFieldLabelClassName}>Couleur au calendrier (optionnel)</label>
              <p className={formFieldHintClassName}>
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
                  className={`${formFieldInputClassName} mt-0 min-w-[120px] flex-1 font-mono`}
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
          </FormDialogSection>

          {!isEdit && !loading ? (
            <FormDialogSection title="Membres">
              <div>
                <label className={formFieldLabelClassName}>Membres de l&apos;équipe</label>
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
            </FormDialogSection>
          ) : null}
        </>
      )}
    </FormPage>
  );
}

export function TeamCreatePage() {
  return <TeamFormPage />;
}
