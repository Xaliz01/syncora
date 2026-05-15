"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/cases.api";
import { listOrganizationUsers } from "@/lib/admin.api";
import { CaseAssigneesTagsInput } from "@/components/cases/CaseAssigneesTagsInput";
import { CaseCustomerPicker } from "@/components/cases/CaseCustomerPicker";
import type { CasePriority } from "@syncora/shared";

export function CaseCreatePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: templates } = useQuery({
    queryKey: ["case-templates"],
    queryFn: () => api.listTemplates(),
  });

  const { data: usersData } = useQuery({
    queryKey: ["organization-users"],
    queryFn: () => listOrganizationUsers(),
  });

  const [templateId, setTemplateId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<CasePriority>("medium");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [error, setError] = useState("");

  const createMutation = useMutation({
    mutationFn: (payload: api.CreateCasePayload) => api.createCase(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      router.push(`/cases/${data.id}`);
    },
    onError: (err: Error) => setError(err.message),
  });

  const selectedTemplate = templates?.find((t) => t.id === templateId);

  const assigneeOptions = useMemo(
    () =>
      (usersData?.users ?? []).map((u) => ({
        id: u.id,
        label: u.name?.trim() || u.email,
      })),
    [usersData?.users],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("Le titre est obligatoire");
      return;
    }
    createMutation.mutate({
      templateId: templateId || undefined,
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      assigneeIds: assigneeIds.length > 0 ? assigneeIds : undefined,
      dueDate: dueDate || undefined,
      tags: tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      customerId: customerId.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">Nouveau dossier</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Créez un dossier, optionnellement basé sur un modèle existant.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {templates && templates.length > 0 && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-4 space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Modèle de dossier (optionnel)
            </label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none bg-white dark:bg-slate-900"
            >
              <option value="">Sans modèle (dossier vierge)</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.steps.length} étapes)
                </option>
              ))}
            </select>
            {selectedTemplate && (
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Ce dossier contiendra {selectedTemplate.steps.length} étape(s) et{" "}
                {selectedTemplate.steps.reduce((a, s) => a + s.todos.length, 0)} tâche(s)
                prédéfinies.
              </div>
            )}
          </div>
        )}

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm dark:shadow-slate-950/20 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Titre
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Titre du dossier"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Description du dossier…"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Priorité
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as CasePriority)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              >
                <option value="low">Basse</option>
                <option value="medium">Moyenne</option>
                <option value="high">Haute</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
                Échéance
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Assignés (optionnel)
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
              Saisissez un nom ou un e-mail pour ajouter des membres sous forme de tags.
            </p>
            {assigneeOptions.length > 0 ? (
              <CaseAssigneesTagsInput
                options={assigneeOptions}
                value={assigneeIds}
                onChange={setAssigneeIds}
                placeholder="Rechercher un membre à assigner…"
              />
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 px-3 py-2">
                Aucun utilisateur dans l&apos;organisation.
              </p>
            )}
          </div>

          <CaseCustomerPicker
            idPrefix="case-create-customer"
            value={customerId}
            onChange={setCustomerId}
            disabled={createMutation.isPending}
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Tags (séparés par des virgules)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="ceed, audit, rénovation…"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition"
          >
            {createMutation.isPending ? "Création…" : "Créer le dossier"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/cases")}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-5 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
