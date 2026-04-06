"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/cases.api";

interface StepForm {
  name: string;
  description: string;
  todos: { label: string; description: string }[];
}

export function TemplateFormPage({ templateId }: { templateId?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = !!templateId;

  const { data: existing } = useQuery({
    queryKey: ["case-template", templateId],
    queryFn: () => api.getTemplate(templateId!),
    enabled: isEdit
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<StepForm[]>([
    { name: "", description: "", todos: [{ label: "", description: "" }] }
  ]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setDescription(existing.description ?? "");
      setSteps(
        existing.steps.map((s) => ({
          name: s.name,
          description: s.description ?? "",
          todos: s.todos.length
            ? s.todos.map((t) => ({ label: t.label, description: t.description ?? "" }))
            : [{ label: "", description: "" }]
        }))
      );
    }
  }, [existing]);

  const createMutation = useMutation({
    mutationFn: (payload: api.CreateTemplatePayload) => api.createTemplate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case-templates"] });
      router.push("/settings/case-templates");
    },
    onError: (err: Error) => setError(err.message)
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<api.CreateTemplatePayload>) =>
      api.updateTemplate(templateId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case-templates"] });
      queryClient.invalidateQueries({ queryKey: ["case-template", templateId] });
      router.push("/settings/case-templates");
    },
    onError: (err: Error) => setError(err.message)
  });

  const addStep = useCallback(() => {
    setSteps((prev) => [...prev, { name: "", description: "", todos: [{ label: "", description: "" }] }]);
  }, []);

  const removeStep = useCallback((index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateStep = useCallback((index: number, field: keyof StepForm, value: string) => {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }, []);

  const addTodo = useCallback((stepIndex: number) => {
    setSteps((prev) =>
      prev.map((s, i) =>
        i === stepIndex ? { ...s, todos: [...s.todos, { label: "", description: "" }] } : s
      )
    );
  }, []);

  const removeTodo = useCallback((stepIndex: number, todoIndex: number) => {
    setSteps((prev) =>
      prev.map((s, i) =>
        i === stepIndex ? { ...s, todos: s.todos.filter((_, j) => j !== todoIndex) } : s
      )
    );
  }, []);

  const updateTodo = useCallback(
    (stepIndex: number, todoIndex: number, field: "label" | "description", value: string) => {
      setSteps((prev) =>
        prev.map((s, i) =>
          i === stepIndex
            ? {
                ...s,
                todos: s.todos.map((t, j) => (j === todoIndex ? { ...t, [field]: value } : t))
              }
            : s
        )
      );
    },
    []
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Le nom est obligatoire");
      return;
    }

    const payload: api.CreateTemplatePayload = {
      name: name.trim(),
      description: description.trim() || undefined,
      steps: steps
        .filter((s) => s.name.trim())
        .map((s, i) => ({
          name: s.name.trim(),
          description: s.description.trim() || undefined,
          order: i,
          todos: s.todos
            .filter((t) => t.label.trim())
            .map((t) => ({
              label: t.label.trim(),
              description: t.description.trim() || undefined
            }))
        }))
    };

    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">
          {isEdit ? "Modifier le modèle" : "Nouveau modèle de dossier"}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Définissez les étapes et tâches qui seront automatiquement créées pour chaque dossier basé sur ce modèle.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nom du modèle
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Ex: Dossier CEED, Audit énergétique…"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="Description optionnelle du modèle…"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-800">Étapes</h2>
            <button
              type="button"
              onClick={addStep}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition self-start"
            >
              + Ajouter une étape
            </button>
          </div>

          {steps.map((step, stepIdx) => (
            <div
              key={stepIdx}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600/10 text-xs font-semibold text-brand-600">
                      {stepIdx + 1}
                    </span>
                    <input
                      type="text"
                      value={step.name}
                      onChange={(e) => updateStep(stepIdx, "name", e.target.value)}
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      placeholder="Nom de l'étape"
                    />
                  </div>
                  <input
                    type="text"
                    value={step.description}
                    onChange={(e) => updateStep(stepIdx, "description", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    placeholder="Description de l'étape (optionnel)"
                  />
                </div>
                {steps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStep(stepIdx)}
                    className="text-xs text-red-500 hover:text-red-600 mt-1"
                  >
                    Supprimer
                  </button>
                )}
              </div>

              <div className="ml-8 space-y-2">
                <div className="text-xs font-medium text-slate-500">Tâches :</div>
                {step.todos.map((todo, todoIdx) => (
                  <div key={todoIdx} className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded border border-slate-300 flex-shrink-0" />
                    <input
                      type="text"
                      value={todo.label}
                      onChange={(e) => updateTodo(stepIdx, todoIdx, "label", e.target.value)}
                      className="flex-1 rounded border border-slate-200 px-2 py-1 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      placeholder="Libellé de la tâche"
                    />
                    {step.todos.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTodo(stepIdx, todoIdx)}
                        className="text-xs text-red-400 hover:text-red-500"
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addTodo(stepIdx)}
                  className="text-xs text-brand-600 hover:text-brand-500 font-medium"
                >
                  + Ajouter une tâche
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition"
          >
            {isPending ? "Enregistrement…" : isEdit ? "Mettre à jour" : "Créer le modèle"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/settings/case-templates")}
            className="rounded-lg border border-slate-200 px-5 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  );
}
