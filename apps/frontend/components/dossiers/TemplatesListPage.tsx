"use client";

import React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/dossiers.api";

export function TemplatesListPage() {
  const queryClient = useQueryClient();
  const { data: templates, isLoading } = useQuery({
    queryKey: ["dossier-templates"],
    queryFn: () => api.listTemplates()
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteTemplate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dossier-templates"] })
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Modèles de dossier</h1>
          <p className="text-sm text-slate-500">
            Configurez des modèles avec étapes et tâches pour créer rapidement des dossiers typés.
          </p>
        </div>
        <Link
          href="/dossiers/templates/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
        >
          Nouveau modèle
        </Link>
      </div>

      {isLoading ? (
        <div className="text-sm text-slate-500">Chargement…</div>
      ) : !templates?.length ? (
        <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/50 p-8 text-center">
          <p className="text-slate-600 mb-2">Aucun modèle de dossier</p>
          <p className="text-sm text-slate-500">
            Créez votre premier modèle pour standardiser la gestion de vos dossiers.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm hover:shadow-md transition"
            >
              <Link href={`/dossiers/templates/${template.id}`} className="block">
                <h3 className="font-semibold text-slate-800">{template.name}</h3>
                {template.description && (
                  <p className="mt-1 text-sm text-slate-500 line-clamp-2">{template.description}</p>
                )}
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
                  <span>{template.steps.length} étape{template.steps.length !== 1 ? "s" : ""}</span>
                  <span>
                    {template.steps.reduce((acc, s) => acc + s.todos.length, 0)} tâche
                    {template.steps.reduce((acc, s) => acc + s.todos.length, 0) !== 1 ? "s" : ""}
                  </span>
                </div>
              </Link>
              <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                <Link
                  href={`/dossiers/templates/${template.id}`}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Modifier
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Supprimer ce modèle ?")) deleteMutation.mutate(template.id);
                  }}
                  className="text-xs text-red-500 hover:text-red-600"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
