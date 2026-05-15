"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/cases.api";
import { useConfirm } from "@/components/ui/ConfirmDialog";
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
  const [search, setSearch] = useState("");

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["case-templates"],
    queryFn: () => api.listTemplates(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteTemplate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["case-templates"] }),
  });

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

  return (
    <ListPageRoot>
      <ListPageHeader
        title="Modèles de dossier"
        description="Configurez des modèles avec étapes et tâches pour créer rapidement des dossiers typés."
        action={
          <PermissionGate permission="case_templates.create">
            <ListPrimaryAction href="/settings/case-templates/new">
              Nouveau modèle
            </ListPrimaryAction>
          </PermissionGate>
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
              <Link
                href="/settings/case-templates/new"
                className="text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium"
              >
                Créer un modèle
              </Link>
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
                  <Link
                    href={`/settings/case-templates/${template.id}`}
                    className="hover:underline"
                  >
                    {template.name}
                  </Link>
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
    </ListPageRoot>
  );
}
