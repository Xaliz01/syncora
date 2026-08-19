"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/cases.api";
import * as adminApi from "@/lib/admin.api";
import type { TodoDashboardVisibility } from "@planwise/shared";
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

interface TodoDashboardRuleForm {
  showOnDashboard: boolean;
  visibility: TodoDashboardVisibility;
  profileIds: string[];
  userIds: string[];
}

interface TodoForm {
  label: string;
  description: string;
  dashboardRule: TodoDashboardRuleForm;
}

const defaultDashboardRule = (): TodoDashboardRuleForm => ({
  showOnDashboard: false,
  visibility: "all",
  profileIds: [],
  userIds: [],
});

interface StepForm {
  name: string;
  description: string;
  todos: TodoForm[];
}

export function TemplateFormPage({ templateId }: { templateId?: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = !!templateId;

  const { data: existing } = useQuery({
    queryKey: ["case-template", templateId],
    queryFn: () => api.getTemplate(templateId!),
    enabled: isEdit,
  });

  const { data: usersData } = useQuery({
    queryKey: ["organization-users"],
    queryFn: () => adminApi.listOrganizationUsers(),
  });

  const { data: profilesData } = useQuery({
    queryKey: ["permission-profiles"],
    queryFn: () => adminApi.listPermissionProfiles(),
  });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<StepForm[]>([
    {
      name: "",
      description: "",
      todos: [{ label: "", description: "", dashboardRule: defaultDashboardRule() }],
    },
  ]);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setDescription(existing.description ?? "");
      setSteps(
        existing.steps.map((s) => ({
          name: s.name,
          description: s.description ?? "",
          todos: s.todos.length
            ? s.todos.map((t) => ({
                label: t.label,
                description: t.description ?? "",
                dashboardRule: t.dashboardRule
                  ? {
                      showOnDashboard: t.dashboardRule.showOnDashboard,
                      visibility: t.dashboardRule.visibility ?? "all",
                      profileIds: t.dashboardRule.profileIds ?? [],
                      userIds: t.dashboardRule.userIds ?? [],
                    }
                  : defaultDashboardRule(),
              }))
            : [{ label: "", description: "", dashboardRule: defaultDashboardRule() }],
        })),
      );
    }
  }, [existing]);

  const createMutation = useMutation({
    mutationFn: (payload: api.CreateTemplatePayload) => api.createTemplate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case-templates"] });
      router.push("/settings/case-templates");
    },
    onError: (err) => setError(err),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<api.CreateTemplatePayload>) =>
      api.updateTemplate(templateId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case-templates"] });
      queryClient.invalidateQueries({ queryKey: ["case-template", templateId] });
      router.push("/settings/case-templates");
    },
    onError: (err) => setError(err),
  });

  const addStep = useCallback(() => {
    setSteps((prev) => [
      ...prev,
      {
        name: "",
        description: "",
        todos: [{ label: "", description: "", dashboardRule: defaultDashboardRule() }],
      },
    ]);
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
        i === stepIndex
          ? {
              ...s,
              todos: [
                ...s.todos,
                { label: "", description: "", dashboardRule: defaultDashboardRule() },
              ],
            }
          : s,
      ),
    );
  }, []);

  const removeTodo = useCallback((stepIndex: number, todoIndex: number) => {
    setSteps((prev) =>
      prev.map((s, i) =>
        i === stepIndex ? { ...s, todos: s.todos.filter((_, j) => j !== todoIndex) } : s,
      ),
    );
  }, []);

  const updateTodo = useCallback(
    (stepIndex: number, todoIndex: number, field: "label" | "description", value: string) => {
      setSteps((prev) =>
        prev.map((s, i) =>
          i === stepIndex
            ? {
                ...s,
                todos: s.todos.map((t, j) => (j === todoIndex ? { ...t, [field]: value } : t)),
              }
            : s,
        ),
      );
    },
    [],
  );

  const updateTodoDashboardRule = useCallback(
    (stepIndex: number, todoIndex: number, rule: Partial<TodoDashboardRuleForm>) => {
      setSteps((prev) =>
        prev.map((s, i) =>
          i === stepIndex
            ? {
                ...s,
                todos: s.todos.map((t, j) =>
                  j === todoIndex ? { ...t, dashboardRule: { ...t.dashboardRule, ...rule } } : t,
                ),
              }
            : s,
        ),
      );
    },
    [],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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
              description: t.description.trim() || undefined,
              dashboardRule: t.dashboardRule.showOnDashboard
                ? {
                    showOnDashboard: true,
                    visibility: t.dashboardRule.visibility,
                    profileIds:
                      t.dashboardRule.visibility === "by_profile"
                        ? t.dashboardRule.profileIds
                        : undefined,
                    userIds:
                      t.dashboardRule.visibility === "by_user"
                        ? t.dashboardRule.userIds
                        : undefined,
                  }
                : undefined,
            })),
        })),
    };

    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <FormPage
      title={isEdit ? "Modifier le modèle" : "Nouveau modèle de dossier"}
      description="Définissez les étapes et tâches qui seront automatiquement créées pour chaque dossier basé sur ce modèle."
      breadcrumb={{ href: "/settings/case-templates", label: "Modèles de dossier" }}
      error={error ? <AppErrorAlert error={error} /> : undefined}
      onSubmit={handleSubmit}
      footer={
        <>
          <FormDialogCancelButton
            onClick={() => router.push("/settings/case-templates")}
            disabled={isPending}
          />
          <FormDialogPrimaryButton type="submit" disabled={isPending}>
            {isPending ? "Enregistrement…" : isEdit ? "Mettre à jour" : "Créer le modèle"}
          </FormDialogPrimaryButton>
        </>
      }
    >
      <FormDialogSection title="Informations générales">
        <div>
          <label className={formFieldLabelClassName}>Nom du modèle</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={formFieldInputClassName}
            placeholder="Ex: Dossier CEED, Audit énergétique…"
          />
        </div>
        <div>
          <label className={formFieldLabelClassName}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={formFieldInputClassName}
            placeholder="Description optionnelle du modèle…"
          />
        </div>
      </FormDialogSection>

      <FormDialogSection title="Étapes et tâches">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <button
              type="button"
              onClick={addStep}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:bg-slate-800 transition self-start"
            >
              + Ajouter une étape
            </button>
          </div>

          {steps.map((step, stepIdx) => (
            <div
              key={stepIdx}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm dark:shadow-slate-950/20 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600/10 text-xs font-semibold text-brand-600 dark:text-brand-400">
                      {stepIdx + 1}
                    </span>
                    <input
                      type="text"
                      value={step.name}
                      onChange={(e) => updateStep(stepIdx, "name", e.target.value)}
                      className={`${formFieldInputClassName} mt-0 flex-1 py-1.5`}
                      placeholder="Nom de l'étape"
                    />
                  </div>
                  <input
                    type="text"
                    value={step.description}
                    onChange={(e) => updateStep(stepIdx, "description", e.target.value)}
                    className={`${formFieldInputClassName} mt-0 py-1.5 text-xs`}
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

              <div className="ml-8 space-y-3">
                <div className={formFieldLabelClassName}>Tâches :</div>
                {step.todos.map((todo, todoIdx) => (
                  <div key={todoIdx} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded border border-slate-300 dark:border-slate-600 flex-shrink-0" />
                      <input
                        type="text"
                        value={todo.label}
                        onChange={(e) => updateTodo(stepIdx, todoIdx, "label", e.target.value)}
                        className={`${formFieldInputClassName} mt-0 flex-1 rounded py-1 text-xs`}
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

                    <div className="ml-5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 p-2.5 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={todo.dashboardRule.showOnDashboard}
                          onChange={(e) =>
                            updateTodoDashboardRule(stepIdx, todoIdx, {
                              showOnDashboard: e.target.checked,
                            })
                          }
                          className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-600 text-brand-600 focus:ring-brand-500"
                        />
                        <span className="text-[11px] text-slate-600 dark:text-slate-400">
                          Afficher sur le tableau de bord
                        </span>
                      </label>

                      {todo.dashboardRule.showOnDashboard && (
                        <div className="space-y-2 pl-5">
                          <div>
                            <label className={formFieldHintClassName}>Visibilité</label>
                            <select
                              value={todo.dashboardRule.visibility}
                              onChange={(e) =>
                                updateTodoDashboardRule(stepIdx, todoIdx, {
                                  visibility: e.target.value as TodoDashboardVisibility,
                                  profileIds: [],
                                  userIds: [],
                                })
                              }
                              className={`${formFieldInputClassName} py-1 text-xs`}
                            >
                              <option value="all">Tous les utilisateurs</option>
                              <option value="by_profile">Par profil</option>
                              <option value="by_user">Par utilisateur</option>
                            </select>
                          </div>

                          {todo.dashboardRule.visibility === "by_profile" && (
                            <div>
                              <label className={formFieldHintClassName}>
                                Profils de permissions
                              </label>
                              <div className="space-y-1">
                                {(profilesData ?? []).map((profile) => (
                                  <label
                                    key={profile.id}
                                    className="flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={todo.dashboardRule.profileIds.includes(profile.id)}
                                      onChange={(e) => {
                                        const newProfileIds = e.target.checked
                                          ? [...todo.dashboardRule.profileIds, profile.id]
                                          : todo.dashboardRule.profileIds.filter(
                                              (id) => id !== profile.id,
                                            );
                                        updateTodoDashboardRule(stepIdx, todoIdx, {
                                          profileIds: newProfileIds,
                                        });
                                      }}
                                      className="h-3 w-3 rounded border-slate-300 dark:border-slate-600 text-brand-600 focus:ring-brand-500"
                                    />
                                    <span className="text-[11px] text-slate-600 dark:text-slate-300">
                                      {profile.name}
                                    </span>
                                  </label>
                                ))}
                                {(profilesData ?? []).length === 0 && (
                                  <p className="text-[11px] text-slate-400">
                                    Aucun profil disponible
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          {todo.dashboardRule.visibility === "by_user" && (
                            <div>
                              <label className={formFieldHintClassName}>Utilisateurs</label>
                              <div className="space-y-1">
                                {(usersData?.users ?? []).map((u) => (
                                  <label
                                    key={u.id}
                                    className="flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={todo.dashboardRule.userIds.includes(u.id)}
                                      onChange={(e) => {
                                        const newIds = e.target.checked
                                          ? [...todo.dashboardRule.userIds, u.id]
                                          : todo.dashboardRule.userIds.filter((id) => id !== u.id);
                                        updateTodoDashboardRule(stepIdx, todoIdx, {
                                          userIds: newIds,
                                        });
                                      }}
                                      className="h-3 w-3 rounded border-slate-300 dark:border-slate-600 text-brand-600 focus:ring-brand-500"
                                    />
                                    <span className="text-[11px] text-slate-600 dark:text-slate-300">
                                      {u.name || u.email}
                                    </span>
                                  </label>
                                ))}
                                {(!usersData?.users || usersData.users.length === 0) && (
                                  <p className="text-[11px] text-slate-400">
                                    Aucun utilisateur disponible
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addTodo(stepIdx)}
                  className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-500 font-medium"
                >
                  + Ajouter une tâche
                </button>
              </div>
            </div>
          ))}
        </div>
      </FormDialogSection>
    </FormPage>
  );
}
