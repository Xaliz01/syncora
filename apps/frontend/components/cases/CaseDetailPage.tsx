"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/cases.api";
import * as stockApi from "@/lib/stock.api";
import { listOrganizationUsers } from "@/lib/admin.api";
import type { CasePriority, CaseStatus, TodoItemStatus } from "@syncora/shared";

const STATUS_LABELS: Record<CaseStatus, string> = {
  draft: "Brouillon",
  open: "Ouvert",
  in_progress: "En cours",
  waiting: "En attente",
  completed: "Terminé",
  cancelled: "Annulé"
};

const STATUS_COLORS: Record<CaseStatus, string> = {
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  open: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  waiting: "bg-purple-50 text-purple-700 border-purple-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-600 border-red-200"
};

const PRIORITY_LABELS: Record<CasePriority, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  urgent: "Urgente"
};

const STATUS_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  draft: ["open", "cancelled"],
  open: ["in_progress", "cancelled"],
  in_progress: ["waiting", "completed", "cancelled"],
  waiting: ["in_progress", "cancelled"],
  completed: ["open"],
  cancelled: ["draft"]
};

const INTERVENTION_STATUS_LABELS: Record<string, string> = {
  planned: "Planifiée",
  in_progress: "En cours",
  completed: "Terminée",
  cancelled: "Annulée"
};

const INTERVENTION_STATUS_COLORS: Record<string, string> = {
  planned: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-600 border-red-200"
};

export function CaseDetailPage({ caseId }: { caseId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: caseData, isLoading } = useQuery({
    queryKey: ["case", caseId],
    queryFn: () => api.getCase(caseId)
  });

  const { data: interventions } = useQuery({
    queryKey: ["interventions", caseId],
    queryFn: () => api.listInterventions({ caseId })
  });

  const { data: usersData } = useQuery({
    queryKey: ["organization-users"],
    queryFn: () => listOrganizationUsers()
  });

  const { data: articles } = useQuery({
    queryKey: ["articles", "intervention-usage"],
    queryFn: () => stockApi.listArticles({ activeOnly: true })
  });

  const { data: stockMovements } = useQuery({
    queryKey: ["stock-movements", caseId],
    queryFn: () => stockApi.listArticleMovements({ caseId, limit: 200 })
  });

  const [showNewIntervention, setShowNewIntervention] = useState(false);
  const [newIntTitle, setNewIntTitle] = useState("");
  const [newIntDesc, setNewIntDesc] = useState("");
  const [newIntAssignee, setNewIntAssignee] = useState("");
  const [newIntStart, setNewIntStart] = useState("");
  const [newIntEnd, setNewIntEnd] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPriority, setEditPriority] = useState<CasePriority>("medium");
  const [editAssignee, setEditAssignee] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [interventionError, setInterventionError] = useState("");
  const [usageDrafts, setUsageDrafts] = useState<
    Record<
      string,
      {
        articleId: string;
        quantity: string;
        movementType: "in" | "out";
        note: string;
      }
    >
  >({});

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["case", caseId] });
    queryClient.invalidateQueries({ queryKey: ["interventions", caseId] });
    queryClient.invalidateQueries({ queryKey: ["cases"] });
    queryClient.invalidateQueries({ queryKey: ["stock-movements", caseId] });
    queryClient.invalidateQueries({ queryKey: ["articles"] });
  };

  const statusMutation = useMutation({
    mutationFn: (status: CaseStatus) => api.updateCase(caseId, { status }),
    onSuccess: invalidateAll
  });

  const updateMutation = useMutation({
    mutationFn: (payload: api.UpdateCasePayload) => api.updateCase(caseId, payload),
    onSuccess: () => {
      invalidateAll();
      setIsEditing(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteCase(caseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      router.push("/cases");
    }
  });

  const todoMutation = useMutation({
    mutationFn: (params: { stepId: string; todoId: string; status: TodoItemStatus }) =>
      api.updateTodo(caseId, params),
    onSuccess: invalidateAll
  });

  const createInterventionMutation = useMutation({
    mutationFn: (payload: api.CreateInterventionPayload) => api.createIntervention(payload),
    onSuccess: () => {
      invalidateAll();
      setShowNewIntervention(false);
      setNewIntTitle("");
      setNewIntDesc("");
      setNewIntAssignee("");
      setNewIntStart("");
      setNewIntEnd("");
      setInterventionError("");
    },
    onError: (err: Error) => setInterventionError(err.message)
  });

  const updateInterventionMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: api.UpdateInterventionPayload }) =>
      api.updateIntervention(id, payload),
    onSuccess: () => {
      invalidateAll();
      setInterventionError("");
    },
    onError: (err: Error) => setInterventionError(err.message)
  });

  const addInterventionArticleMutation = useMutation({
    mutationFn: ({
      interventionId,
      payload
    }: {
      interventionId: string;
      payload: stockApi.AddInterventionArticleUsagePayload;
    }) => stockApi.addInterventionArticleUsage(interventionId, payload),
    onSuccess: (_, variables) => {
      invalidateAll();
      setInterventionError("");
      setUsageDrafts((prev) => ({
        ...prev,
        [variables.interventionId]: {
          articleId: "",
          quantity: "1",
          movementType: "out",
          note: ""
        }
      }));
    },
    onError: (err: Error) => setInterventionError(err.message)
  });

  const interventionUsageMap = useMemo(() => {
    const map = new Map<
      string,
      Array<{
        articleId: string;
        articleName: string;
        articleReference?: string;
        unit: string;
        consumedQuantity: number;
        returnedQuantity: number;
        netQuantity: number;
      }>
    >();
    const byInterventionArticle = new Map<
      string,
      {
        interventionId: string;
        articleId: string;
        articleName: string;
        articleReference?: string;
        unit: string;
        consumedQuantity: number;
        returnedQuantity: number;
        netQuantity: number;
      }
    >();
    const articleUnits = new Map((articles ?? []).map((article) => [article.id, article.unit]));

    for (const movement of stockMovements ?? []) {
      if (!movement.interventionId) continue;
      if (movement.movementType !== "in" && movement.movementType !== "out") continue;
      const key = `${movement.interventionId}::${movement.articleId}`;
      const existing = byInterventionArticle.get(key) ?? {
        interventionId: movement.interventionId,
        articleId: movement.articleId,
        articleName: movement.articleName,
        articleReference: movement.articleReference,
        unit: articleUnits.get(movement.articleId) ?? "unité",
        consumedQuantity: 0,
        returnedQuantity: 0,
        netQuantity: 0
      };
      if (movement.movementType === "out") existing.consumedQuantity += movement.quantity;
      if (movement.movementType === "in") existing.returnedQuantity += movement.quantity;
      existing.netQuantity = Math.max(existing.consumedQuantity - existing.returnedQuantity, 0);
      byInterventionArticle.set(key, existing);
    }

    for (const value of byInterventionArticle.values()) {
      const existing = map.get(value.interventionId) ?? [];
      existing.push({
        articleId: value.articleId,
        articleName: value.articleName,
        articleReference: value.articleReference,
        unit: value.unit,
        consumedQuantity: value.consumedQuantity,
        returnedQuantity: value.returnedQuantity,
        netQuantity: value.netQuantity
      });
      map.set(value.interventionId, existing);
    }
    return map;
  }, [articles, stockMovements]);

  if (isLoading || !caseData) {
    return <div className="text-sm text-slate-500">Chargement…</div>;
  }

  const allowedTransitions = STATUS_TRANSITIONS[caseData.status] ?? [];
  const isOverdue = caseData.dueDate && new Date(caseData.dueDate) < new Date() && caseData.status !== "completed" && caseData.status !== "cancelled";

  const startEditing = () => {
    setEditTitle(caseData.title);
    setEditDesc(caseData.description ?? "");
    setEditPriority(caseData.priority);
    setEditAssignee(caseData.assigneeId ?? "");
    setEditDueDate(caseData.dueDate ? caseData.dueDate.split("T")[0] : "");
    setIsEditing(true);
  };

  const handleEditSubmit = () => {
    updateMutation.mutate({
      title: editTitle,
      description: editDesc || undefined,
      priority: editPriority,
      assigneeId: editAssignee || null,
      dueDate: editDueDate || null
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link href="/cases" className="text-sm text-brand-600 hover:text-brand-500 font-medium">
              &larr; Dossiers
            </Link>
          </div>

          {isEditing ? (
            <div className="space-y-3 max-w-xl">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-lg font-semibold focus:border-brand-500 focus:outline-none"
              />
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <select
                  value={editPriority}
                  onChange={(e) => setEditPriority(e.target.value as CasePriority)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="low">Basse</option>
                  <option value="medium">Moyenne</option>
                  <option value="high">Haute</option>
                  <option value="urgent">Urgente</option>
                </select>
                <select
                  value={editAssignee}
                  onChange={(e) => setEditAssignee(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Non assigné</option>
                  {usersData?.users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleEditSubmit}
                  disabled={updateMutation.isPending}
                  className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition"
                >
                  Enregistrer
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="rounded-lg border border-slate-200 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-semibold">{caseData.title}</h1>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[caseData.status]}`}>
                  {STATUS_LABELS[caseData.status]}
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  caseData.priority === "urgent" ? "bg-red-50 text-red-600" :
                  caseData.priority === "high" ? "bg-orange-50 text-orange-600" :
                  caseData.priority === "medium" ? "bg-blue-50 text-blue-600" :
                  "bg-slate-100 text-slate-500"
                }`}>
                  {PRIORITY_LABELS[caseData.priority]}
                </span>
                {isOverdue && (
                  <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                    En retard
                  </span>
                )}
              </div>
              {caseData.description && (
                <p className="mt-1 text-sm text-slate-500">{caseData.description}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                {caseData.assigneeName && <span>Assigné à : {caseData.assigneeName}</span>}
                {caseData.dueDate && (
                  <span>Échéance : {new Date(caseData.dueDate).toLocaleDateString("fr-FR")}</span>
                )}
                {caseData.tags.length > 0 && (
                  <span className="flex gap-1">
                    {caseData.tags.map((t) => (
                      <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px]">{t}</span>
                    ))}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isEditing && (
            <button
              onClick={startEditing}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 transition"
            >
              Modifier
            </button>
          )}
          <button
            onClick={() => {
              if (confirm("Supprimer ce dossier et toutes ses interventions ?")) deleteMutation.mutate();
            }}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition"
          >
            Supprimer
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium text-slate-700">Progression</div>
          <div className="text-sm font-semibold text-slate-800">{caseData.progress}%</div>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all ${
              caseData.progress === 100 ? "bg-green-500" : "bg-brand-600"
            }`}
            style={{ width: `${caseData.progress}%` }}
          />
        </div>
        {allowedTransitions.length > 0 && (
          <div className="mt-3 flex gap-2 flex-wrap">
            <span className="text-xs text-slate-500 self-center">Changer le statut :</span>
            {allowedTransitions.map((s) => (
              <button
                key={s}
                onClick={() => statusMutation.mutate(s)}
                disabled={statusMutation.isPending}
                className={`rounded-lg border px-3 py-1 text-xs font-medium transition hover:shadow-sm ${STATUS_COLORS[s]}`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        )}
      </div>

      {caseData.steps.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800">Étapes & Tâches</h2>
          {[...caseData.steps].sort((a, b) => a.order - b.order).map((step) => {
            const doneTodos = step.todos.filter((t) => t.status === "done" || t.status === "skipped").length;
            const totalTodos = step.todos.length;
            const stepProgress = totalTodos > 0 ? Math.round((doneTodos / totalTodos) * 100) : 0;

            return (
              <div key={step.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600/10 text-xs font-semibold text-brand-600">
                      {step.order + 1}
                    </span>
                    <h3 className="font-semibold text-slate-700">{step.name}</h3>
                  </div>
                  <span className="text-xs text-slate-500">
                    {doneTodos}/{totalTodos} — {stepProgress}%
                  </span>
                </div>
                {step.description && (
                  <p className="text-xs text-slate-500 mb-2 ml-8">{step.description}</p>
                )}
                <div className="ml-8 space-y-1.5">
                  {step.todos.map((todo) => (
                    <div key={todo.id} className="flex items-center gap-2 group">
                      <button
                        type="button"
                        onClick={() => {
                          const newStatus: TodoItemStatus = todo.status === "done" ? "pending" : "done";
                          todoMutation.mutate({
                            stepId: step.id,
                            todoId: todo.id,
                            status: newStatus
                          });
                        }}
                        className={`h-4 w-4 rounded border flex-shrink-0 flex items-center justify-center transition ${
                          todo.status === "done"
                            ? "bg-green-500 border-green-500 text-white"
                            : todo.status === "skipped"
                            ? "bg-slate-300 border-slate-300 text-white"
                            : "border-slate-300 hover:border-brand-500"
                        }`}
                      >
                        {todo.status === "done" && (
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <span
                        className={`text-sm ${
                          todo.status === "done"
                            ? "text-slate-400 line-through"
                            : todo.status === "skipped"
                            ? "text-slate-400 line-through"
                            : "text-slate-700"
                        }`}
                      >
                        {todo.label}
                      </span>
                      {todo.status === "pending" && (
                        <button
                          type="button"
                          onClick={() =>
                            todoMutation.mutate({ stepId: step.id, todoId: todo.id, status: "skipped" })
                          }
                          className="text-[10px] text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition"
                        >
                          ignorer
                        </button>
                      )}
                      {todo.completedAt && (
                        <span className="text-[10px] text-slate-400">
                          {new Date(todo.completedAt).toLocaleDateString("fr-FR")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-800">
            Interventions ({interventions?.length ?? 0})
          </h2>
          <button
            onClick={() => setShowNewIntervention(!showNewIntervention)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition self-start"
          >
            {showNewIntervention ? "Annuler" : "+ Planifier une intervention"}
          </button>
        </div>

        {interventionError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {interventionError}
          </div>
        )}

        {showNewIntervention && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={newIntTitle}
                onChange={(e) => setNewIntTitle(e.target.value)}
                placeholder="Titre de l'intervention"
                className="sm:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
              <textarea
                value={newIntDesc}
                onChange={(e) => setNewIntDesc(e.target.value)}
                placeholder="Description (optionnelle)"
                rows={2}
                className="sm:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              />
              <select
                value={newIntAssignee}
                onChange={(e) => setNewIntAssignee(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Non assignée</option>
                {usersData?.users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
                ))}
              </select>
              <div />
              <div>
                <label className="text-xs text-slate-500">Début</label>
                <input
                  type="datetime-local"
                  value={newIntStart}
                  onChange={(e) => setNewIntStart(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500">Fin</label>
                <input
                  type="datetime-local"
                  value={newIntEnd}
                  onChange={(e) => setNewIntEnd(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <button
              onClick={() => {
                if (!newIntTitle.trim()) return;
                createInterventionMutation.mutate({
                  caseId,
                  title: newIntTitle.trim(),
                  description: newIntDesc.trim() || undefined,
                  assigneeId: newIntAssignee || undefined,
                  scheduledStart: newIntStart ? new Date(newIntStart).toISOString() : undefined,
                  scheduledEnd: newIntEnd ? new Date(newIntEnd).toISOString() : undefined
                });
              }}
              disabled={createInterventionMutation.isPending}
              className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition"
            >
              Créer l&apos;intervention
            </button>
          </div>
        )}

        {interventions && interventions.length > 0 ? (
          <div className="space-y-2">
            {interventions.map((intervention) => {
              const usedArticles = interventionUsageMap.get(intervention.id) ?? [];
              return (
                <div
                  key={intervention.id}
                  id={`intervention-${intervention.id}`}
                  className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm scroll-mt-4"
                >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm text-slate-800">{intervention.title}</h4>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                      INTERVENTION_STATUS_COLORS[intervention.status] ?? ""
                    }`}>
                      {INTERVENTION_STATUS_LABELS[intervention.status] ?? intervention.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {intervention.status === "planned" && (
                      <button
                        onClick={() =>
                          updateInterventionMutation.mutate({
                            id: intervention.id,
                            payload: { status: "in_progress" }
                          })
                        }
                        className="text-[10px] text-amber-600 hover:text-amber-700 px-1.5 py-0.5 rounded bg-amber-50"
                      >
                        Démarrer
                      </button>
                    )}
                    {intervention.status === "in_progress" && (
                      <button
                        onClick={() =>
                          updateInterventionMutation.mutate({
                            id: intervention.id,
                            payload: { status: "completed" }
                          })
                        }
                        className="text-[10px] text-green-600 hover:text-green-700 px-1.5 py-0.5 rounded bg-green-50"
                      >
                        Terminer
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  {intervention.assigneeName && <span>{intervention.assigneeName}</span>}
                  {intervention.scheduledStart && (
                    <span>
                      {new Date(intervention.scheduledStart).toLocaleDateString("fr-FR")}{" "}
                      {new Date(intervention.scheduledStart).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  )}
                  {intervention.scheduledEnd && (
                    <span>
                      &rarr;{" "}
                      {new Date(intervention.scheduledEnd).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  )}
                </div>
                {intervention.description && (
                  <p className="mt-1 text-xs text-slate-400">{intervention.description}</p>
                )}

                {usedArticles.length > 0 && (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <div className="text-[11px] font-semibold text-slate-700 mb-1">
                      Articles liés à l&apos;intervention
                    </div>
                    <div className="space-y-1">
                      {usedArticles.map((item) => (
                        <div
                          key={item.articleId}
                          className="flex flex-wrap items-center justify-between text-[11px] text-slate-600 gap-1"
                        >
                          <span>
                            {item.articleName}
                            {item.articleReference ? ` (${item.articleReference})` : ""}
                          </span>
                          <span className="text-right">
                            consommé: {item.consumedQuantity} / retourné: {item.returnedQuantity} / net:{" "}
                            {item.netQuantity} {item.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2">
                  <div className="mb-1 text-[11px] font-semibold text-slate-700">
                    Mouvement de stock sur cette intervention
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    <select
                      value={usageDrafts[intervention.id]?.articleId ?? ""}
                      onChange={(e) =>
                        setUsageDrafts((prev) => ({
                          ...prev,
                          [intervention.id]: {
                            articleId: e.target.value,
                            quantity: prev[intervention.id]?.quantity ?? "1",
                            movementType: prev[intervention.id]?.movementType ?? "out",
                            note: prev[intervention.id]?.note ?? ""
                          }
                        }))
                      }
                      className="rounded border border-slate-200 px-2 py-1 text-xs"
                    >
                      <option value="">Article</option>
                      {(articles ?? []).map((article) => (
                        <option key={article.id} value={article.id}>
                          {article.reference} — {article.name} ({article.stockQuantity})
                        </option>
                      ))}
                    </select>
                    <select
                      value={usageDrafts[intervention.id]?.movementType ?? "out"}
                      onChange={(e) =>
                        setUsageDrafts((prev) => ({
                          ...prev,
                          [intervention.id]: {
                            articleId: prev[intervention.id]?.articleId ?? "",
                            quantity: prev[intervention.id]?.quantity ?? "1",
                            movementType: e.target.value as "in" | "out",
                            note: prev[intervention.id]?.note ?? ""
                          }
                        }))
                      }
                      className="rounded border border-slate-200 px-2 py-1 text-xs"
                    >
                      <option value="out">Consommation (-)</option>
                      <option value="in">Retour (+)</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={usageDrafts[intervention.id]?.quantity ?? "1"}
                      onChange={(e) =>
                        setUsageDrafts((prev) => ({
                          ...prev,
                          [intervention.id]: {
                            articleId: prev[intervention.id]?.articleId ?? "",
                            quantity: e.target.value,
                            movementType: prev[intervention.id]?.movementType ?? "out",
                            note: prev[intervention.id]?.note ?? ""
                          }
                        }))
                      }
                      className="rounded border border-slate-200 px-2 py-1 text-xs"
                      placeholder="Quantité"
                    />
                    <input
                      value={usageDrafts[intervention.id]?.note ?? ""}
                      onChange={(e) =>
                        setUsageDrafts((prev) => ({
                          ...prev,
                          [intervention.id]: {
                            articleId: prev[intervention.id]?.articleId ?? "",
                            quantity: prev[intervention.id]?.quantity ?? "1",
                            movementType: prev[intervention.id]?.movementType ?? "out",
                            note: e.target.value
                          }
                        }))
                      }
                      className="rounded border border-slate-200 px-2 py-1 text-xs"
                      placeholder="Note (optionnelle)"
                    />
                  </div>
                  <div className="mt-2">
                    <button
                      onClick={() => {
                        const draft = usageDrafts[intervention.id];
                        if (!draft?.articleId) {
                          setInterventionError("Sélectionnez un article avant de valider le mouvement");
                          return;
                        }
                        const qty = Number(draft.quantity);
                        if (!Number.isFinite(qty) || qty <= 0) {
                          setInterventionError("La quantité doit être strictement positive");
                          return;
                        }
                        addInterventionArticleMutation.mutate({
                          interventionId: intervention.id,
                          payload: {
                            caseId,
                            articleId: draft.articleId,
                            movementType: draft.movementType,
                            quantity: qty,
                            note: draft.note.trim() || undefined
                          }
                        });
                      }}
                      disabled={addInterventionArticleMutation.isPending}
                      className="rounded bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition"
                    >
                      Enregistrer le mouvement
                    </button>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        ) : (
          !showNewIntervention && (
            <div className="text-sm text-slate-500">
              Aucune intervention planifiée pour ce dossier.
            </div>
          )
        )}
      </div>
    </div>
  );
}
