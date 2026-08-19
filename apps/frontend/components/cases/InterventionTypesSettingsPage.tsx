"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_INTERVENTION_TYPE_PRESETS } from "@planwise/shared";
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
  ListPrimaryAction,
  ListRow,
  ListSearchField,
  ListTableShell,
  ListToolbar,
} from "@/components/ui/list-page";

const GRID = "md:grid-cols-[1.2fr_2fr_0.7fr_auto]";

export function InterventionTypesSettingsPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["intervention-types"],
    queryFn: () => api.listInterventionTypes(),
  });
  const types = useMemo(() => data?.types ?? [], [data?.types]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["intervention-types"] });
  };

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
              <ListPrimaryAction href="/settings/intervention-types/new">
                Nouveau type
              </ListPrimaryAction>
            </PermissionGate>
          </div>
        }
      />

      {error ? <ListPageError message={error} fallbackMessage="Une erreur est survenue." /> : null}

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
                <Link
                  href="/settings/intervention-types/new"
                  className="text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium"
                >
                  Créer un type
                </Link>
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
            const swatch = normalizeCalendarColorHex(type.color);
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
                <div className="flex flex-wrap gap-2 justify-end">
                  <PermissionGate permission="intervention_types.update">
                    <Link
                      href={`/settings/intervention-types/${type.id}/edit`}
                      className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-500 font-medium"
                    >
                      Modifier
                    </Link>
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
