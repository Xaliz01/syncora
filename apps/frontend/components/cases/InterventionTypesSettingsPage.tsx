"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_INTERVENTION_TYPE_PRESETS, type InterventionTypeResponse } from "@planwise/shared";
import * as api from "@/lib/cases.api";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { ImportDefaultsDialog } from "@/components/settings/ImportDefaultsDialog";
import { TestDataBadgeIf } from "@/components/test-data/TestDataBadge";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { normalizeCalendarColorHex } from "@/lib/team-calendar-colors";
import {
  filterListItems,
  ListCellDefault,
  ListCellMuted,
  ListCellPrimary,
  ListEmptyState,
  ListLoadingState,
  ListNoResults,
  ListPageError,
  ListPageHeader,
  ListPageRoot,
  ListRow,
  ListSearchField,
  ListTableShell,
  ListToolbar,
} from "@/components/ui/list-page";

const GRID = "md:grid-cols-[1.2fr_2fr_0.7fr_auto]";
const DEFAULT_COLOR = "#64748b";

const INPUT_CLASS =
  "w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-500 focus:outline-none";

function ColorFields({ color, onChange }: { color: string; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="color"
        aria-label="Couleur du type"
        className="h-10 w-14 cursor-pointer rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900"
        value={normalizeCalendarColorHex(color) ?? DEFAULT_COLOR}
        onChange={(e) => onChange(e.target.value)}
      />
      <input
        type="text"
        placeholder="#RRGGBB"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-[120px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-mono"
      />
    </div>
  );
}

function TypeFormFields({
  name,
  description,
  color,
  onNameChange,
  onDescriptionChange,
  onColorChange,
}: {
  name: string;
  description: string;
  color: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onColorChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="sm:col-span-2">
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
          Nom <span className="text-red-500">*</span>
        </label>
        <input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Ex. Pose, SAV…"
          className={INPUT_CLASS}
        />
      </div>
      <div className="sm:col-span-2">
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Optionnel"
          rows={2}
          className={INPUT_CLASS}
        />
      </div>
      <div className="sm:col-span-2">
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">
          Couleur
        </label>
        <ColorFields color={color} onChange={onColorChange} />
      </div>
    </div>
  );
}

export function InterventionTypesSettingsPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState("");

  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createColor, setCreateColor] = useState(DEFAULT_COLOR);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editColor, setEditColor] = useState(DEFAULT_COLOR);

  const { data, isLoading } = useQuery({
    queryKey: ["intervention-types"],
    queryFn: () => api.listInterventionTypes(),
  });
  const types = data?.types ?? [];

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["intervention-types"] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: api.CreateInterventionTypePayload) => api.createInterventionType(payload),
    onSuccess: () => {
      invalidate();
      setShowCreateForm(false);
      resetCreateForm();
      setError("");
    },
    onError: (err: Error) => setError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: api.UpdateInterventionTypePayload }) =>
      api.updateInterventionType(id, payload),
    onSuccess: () => {
      invalidate();
      setEditingId(null);
      setError("");
    },
    onError: (err: Error) => setError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteInterventionType(id),
    onSuccess: () => invalidate(),
    onError: (err: Error) => setError(err.message),
  });

  const existingNames = useMemo(
    () => new Set(types.map((t) => t.name.trim().toLowerCase())),
    [types],
  );

  const importItems = useMemo(
    () =>
      DEFAULT_INTERVENTION_TYPE_PRESETS.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        meta: t.color,
        alreadyExists: existingNames.has(t.name.trim().toLowerCase()),
      })),
    [existingNames],
  );

  const filtered = useMemo(
    () => filterListItems(types, search, (t) => [t.name, t.description ?? "", t.color ?? ""]),
    [types, search],
  );

  function resetCreateForm() {
    setCreateName("");
    setCreateDescription("");
    setCreateColor(DEFAULT_COLOR);
  }

  function startEdit(type: InterventionTypeResponse) {
    setEditingId(type.id);
    setEditName(type.name);
    setEditDescription(type.description ?? "");
    setEditColor(normalizeCalendarColorHex(type.color) ?? DEFAULT_COLOR);
    setShowCreateForm(false);
    setError("");
  }

  function handleCreate() {
    if (!createName.trim()) {
      setError("Le nom est obligatoire");
      return;
    }
    const color = normalizeCalendarColorHex(createColor) ?? undefined;
    createMutation.mutate({
      name: createName.trim(),
      description: createDescription.trim() || undefined,
      color,
    });
  }

  function handleUpdate() {
    if (!editingId) return;
    if (!editName.trim()) {
      setError("Le nom est obligatoire");
      return;
    }
    const color = normalizeCalendarColorHex(editColor);
    updateMutation.mutate({
      id: editingId,
      payload: {
        name: editName.trim(),
        description: editDescription.trim() || null,
        color,
      },
    });
  }

  const handleImport = async (ids: string[]) => {
    setImporting(true);
    let ok = 0;
    let failed = 0;
    try {
      for (const id of ids) {
        const preset = DEFAULT_INTERVENTION_TYPE_PRESETS.find((p) => p.id === id);
        if (!preset) continue;
        if (existingNames.has(preset.name.trim().toLowerCase())) continue;
        try {
          await api.createInterventionType({
            name: preset.name,
            description: preset.description,
            color: preset.color,
          });
          ok += 1;
        } catch {
          failed += 1;
        }
      }
      invalidate();
      setImportOpen(false);
      if (ok > 0) {
        showToast(
          `${ok} type${ok > 1 ? "s" : ""} importé${ok > 1 ? "s" : ""}${
            failed > 0 ? ` (${failed} échec${failed > 1 ? "s" : ""})` : ""
          }.`,
        );
      } else if (failed > 0) {
        showToast("Aucun type importé.", "error");
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <ListPageRoot>
      <ListPageHeader
        title="Types d’intervention"
        description="Catalogue des types (Pose, SAV…) utilisés à la planification. Importez des modèles prêts à l’emploi ou créez le vôtre."
        action={
          <div className="flex flex-wrap gap-2">
            <PermissionGate permission="intervention_types.create">
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Importer depuis la librairie
              </button>
            </PermissionGate>
            <PermissionGate permission="intervention_types.create">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm((prev) => !prev);
                  setEditingId(null);
                  setError("");
                }}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 transition"
              >
                {showCreateForm ? "Fermer" : "Nouveau type"}
              </button>
            </PermissionGate>
          </div>
        }
      />

      {error ? <ListPageError message={error} fallbackMessage="Une erreur est survenue." /> : null}

      {showCreateForm ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Créer un type</h2>
          <TypeFormFields
            name={createName}
            description={createDescription}
            color={createColor}
            onNameChange={setCreateName}
            onDescriptionChange={setCreateDescription}
            onColorChange={setCreateColor}
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={createMutation.isPending}
            className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition"
          >
            Créer le type
          </button>
        </div>
      ) : null}

      <ListToolbar>
        <ListSearchField
          value={search}
          onChange={setSearch}
          placeholder="Filtrer par nom ou description…"
        />
      </ListToolbar>

      {isLoading ? (
        <ListLoadingState />
      ) : types.length === 0 ? (
        <ListEmptyState
          message="Aucun type d’intervention."
          action={
            <PermissionGate permission="intervention_types.create">
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => setImportOpen(true)}
                  className="text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium"
                >
                  Importer des types métiers
                </button>
                <span className="text-slate-400 hidden sm:inline">ou</span>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(true)}
                  className="text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium"
                >
                  Créer un type
                </button>
              </div>
            </PermissionGate>
          }
        />
      ) : filtered.length === 0 ? (
        <ListNoResults />
      ) : (
        <ListTableShell
          gridTemplateClass={GRID}
          headerCells={
            <>
              <span>Nom</span>
              <span>Description</span>
              <span>Couleur</span>
              <span className="text-right md:text-left">Actions</span>
            </>
          }
        >
          {filtered.map((type) => {
            const isEditing = editingId === type.id;
            const swatch = normalizeCalendarColorHex(type.color);
            if (isEditing) {
              return (
                <div
                  key={type.id}
                  className="border-b border-slate-200 dark:border-slate-700 last:border-b-0 bg-brand-50/30 dark:bg-brand-950/20 p-4 space-y-3"
                >
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Modifier le type
                  </h3>
                  <TypeFormFields
                    name={editName}
                    description={editDescription}
                    color={editColor}
                    onNameChange={setEditName}
                    onDescriptionChange={setEditDescription}
                    onColorChange={setEditColor}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleUpdate}
                      disabled={updateMutation.isPending}
                      className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition"
                    >
                      Enregistrer
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setError("");
                      }}
                      className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              );
            }
            return (
              <ListRow key={type.id} gridTemplateClass={GRID}>
                <ListCellPrimary>
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <span className="truncate">{type.name}</span>
                    <TestDataBadgeIf isTestData={type.isTestData} />
                  </span>
                </ListCellPrimary>
                <ListCellMuted className="line-clamp-2">{type.description || "—"}</ListCellMuted>
                <ListCellDefault>
                  {swatch ? (
                    <span className="inline-flex items-center gap-2 text-xs font-mono text-slate-600 dark:text-slate-300">
                      <span
                        className="h-4 w-4 rounded border border-slate-200 dark:border-slate-600"
                        style={{ backgroundColor: swatch }}
                        aria-hidden
                      />
                      {swatch}
                    </span>
                  ) : (
                    "—"
                  )}
                </ListCellDefault>
                <div className="flex flex-wrap gap-2 justify-end md:justify-start">
                  <PermissionGate permission="intervention_types.update">
                    <button
                      type="button"
                      onClick={() => startEdit(type)}
                      className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-500 font-medium"
                    >
                      Modifier
                    </button>
                  </PermissionGate>
                  <PermissionGate permission="intervention_types.delete">
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await confirm({
                          title: "Supprimer ce type ?",
                          description:
                            "Les interventions déjà créées conservent le type figé. Le type ne sera plus proposé pour les nouvelles interventions.",
                          confirmLabel: "Supprimer le type",
                          variant: "danger",
                        });
                        if (ok) deleteMutation.mutate(type.id);
                      }}
                      className="text-xs text-red-500 hover:text-red-600"
                    >
                      Supprimer
                    </button>
                  </PermissionGate>
                </div>
              </ListRow>
            );
          })}
        </ListTableShell>
      )}

      <ImportDefaultsDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Importer des types d’intervention"
        description="Pose, SAV… Les types déjà présents (même nom) sont ignorés."
        items={importItems}
        importing={importing}
        onImport={handleImport}
      />
    </ListPageRoot>
  );
}
