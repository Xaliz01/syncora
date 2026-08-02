"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_CASE_TEMPLATE_PRESETS } from "@planwise/shared";
import * as api from "@/lib/cases.api";
import { TestDataBadgeIf } from "@/components/test-data/TestDataBadge";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { ImportDefaultsDialog } from "@/components/settings/ImportDefaultsDialog";
import { useToast } from "@/components/ui/ToastProvider";
import {
  filterListItems,
  ListCellDefault,
  ListCellMuted,
  ListCellPrimary,
  ListEmptyState,
  ListLoadingState,
  ListNoResults,
  ListPageHeader,
  ListPageRoot,
  ListPrimaryAction,
  ListRow,
  ListSearchField,
  ListTableShell,
  ListToolbar,
} from "@/components/ui/list-page";
import { PermissionGate } from "@/components/auth/PermissionGate";

const GRID = "md:grid-cols-[1.2fr_2fr_0.9fr_auto]";

export function TemplatesListPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["case-templates"],
    queryFn: () => api.listTemplates(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteTemplate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["case-templates"] }),
  });

  const existingNames = useMemo(
    () => new Set(templates.map((t) => t.name.trim().toLowerCase())),
    [templates],
  );

  const importItems = useMemo(
    () =>
      DEFAULT_CASE_TEMPLATE_PRESETS.map((t) => {
        const todoCount = t.steps.reduce((acc, s) => acc + s.todos.length, 0);
        return {
          id: t.id,
          name: t.name,
          description: t.description,
          category: t.category,
          meta: `${t.steps.length} étape${t.steps.length > 1 ? "s" : ""} · ${todoCount} tâche${todoCount > 1 ? "s" : ""}`,
          alreadyExists: existingNames.has(t.name.trim().toLowerCase()),
        };
      }),
    [existingNames],
  );

  const filtered = useMemo(
    () =>
      filterListItems(templates, search, (t) => [
        t.name,
        t.description,
        String(t.steps.length),
        String(t.steps.reduce((acc, s) => acc + s.todos.length, 0)),
      ]),
    [templates, search],
  );

  const handleImport = async (ids: string[]) => {
    setImporting(true);
    let ok = 0;
    let failed = 0;
    try {
      for (const id of ids) {
        const preset = DEFAULT_CASE_TEMPLATE_PRESETS.find((p) => p.id === id);
        if (!preset) continue;
        if (existingNames.has(preset.name.trim().toLowerCase())) continue;
        try {
          await api.createTemplate({
            name: preset.name,
            description: preset.description,
            steps: preset.steps.map((s) => ({
              name: s.name,
              description: s.description,
              order: s.order,
              todos: s.todos.map((todo) => ({
                label: todo.label,
                description: todo.description,
                dashboardRule: todo.dashboardRule,
              })),
            })),
          });
          ok += 1;
        } catch {
          failed += 1;
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["case-templates"] });
      setImportOpen(false);
      if (ok > 0) {
        showToast(
          `${ok} modèle${ok > 1 ? "s" : ""} importé${ok > 1 ? "s" : ""}${
            failed > 0 ? ` (${failed} échec${failed > 1 ? "s" : ""})` : ""
          }.`,
        );
      } else if (failed > 0) {
        showToast("Aucun modèle importé.", "error");
      }
    } finally {
      setImporting(false);
    }
  };

  return (
    <ListPageRoot>
      <ListPageHeader
        title="Modèles de dossier"
        description="Importez des modèles métiers prêts à l’emploi, ou créez le vôtre avec étapes et tâches."
        action={
          <div className="flex flex-wrap gap-2">
            <PermissionGate permission="case_templates.create">
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Importer depuis la librairie
              </button>
            </PermissionGate>
            <PermissionGate permission="case_templates.create">
              <ListPrimaryAction href="/settings/case-templates/new">
                Nouveau modèle
              </ListPrimaryAction>
            </PermissionGate>
          </div>
        }
      />

      <ListToolbar>
        <ListSearchField
          value={search}
          onChange={setSearch}
          placeholder="Filtrer par nom ou description…"
        />
      </ListToolbar>

      {isLoading ? (
        <ListLoadingState />
      ) : templates.length === 0 ? (
        <ListEmptyState
          message="Aucun modèle de dossier."
          action={
            <PermissionGate permission="case_templates.create">
              <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => setImportOpen(true)}
                  className="text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium"
                >
                  Importer des modèles métiers
                </button>
                <span className="text-slate-400 hidden sm:inline">ou</span>
                <Link
                  href="/settings/case-templates/new"
                  className="text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium"
                >
                  Créer un modèle
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
              <span>Structure</span>
              <span className="text-right md:text-left">Actions</span>
            </>
          }
        >
          {filtered.map((template) => {
            const todoCount = template.steps.reduce((acc, s) => acc + s.todos.length, 0);
            return (
              <ListRow key={template.id} gridTemplateClass={GRID}>
                <ListCellPrimary>
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <Link
                      href={`/settings/case-templates/${template.id}`}
                      className="hover:underline truncate"
                    >
                      {template.name}
                    </Link>
                    <TestDataBadgeIf isTestData={template.isTestData} />
                  </span>
                </ListCellPrimary>
                <ListCellMuted className="line-clamp-2 md:line-clamp-2">
                  {template.description || "—"}
                </ListCellMuted>
                <ListCellDefault>
                  {template.steps.length} étape{template.steps.length !== 1 ? "s" : ""} ·{" "}
                  {todoCount} tâche
                  {todoCount !== 1 ? "s" : ""}
                </ListCellDefault>
                <div className="flex flex-wrap gap-2 justify-end md:justify-start">
                  <PermissionGate permission="case_templates.update">
                    <Link
                      href={`/settings/case-templates/${template.id}`}
                      className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-500 font-medium"
                    >
                      Modifier
                    </Link>
                  </PermissionGate>
                  <PermissionGate permission="case_templates.delete">
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await confirm({
                          title: "Supprimer ce modèle ?",
                          description:
                            "Les dossiers déjà créés à partir de ce modèle ne sont pas supprimés, mais le modèle ne sera plus disponible pour les nouveaux dossiers.",
                          confirmLabel: "Supprimer le modèle",
                          variant: "danger",
                        });
                        if (ok) deleteMutation.mutate(template.id);
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
        title="Importer des modèles de dossier"
        description="Plomberie, électricité, chauffage, serrurerie, maintenance… Les modèles déjà présents (même nom) sont ignorés."
        items={importItems}
        importing={importing}
        onImport={handleImport}
      />
    </ListPageRoot>
  );
}
