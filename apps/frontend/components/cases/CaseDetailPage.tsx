"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/cases.api";
import * as fleetApi from "@/lib/fleet.api";
import * as customersApi from "@/lib/customers.api";
import * as stockApi from "@/lib/stock.api";
import { listOrganizationUsers } from "@/lib/admin.api";
import { DocumentUploadZone } from "@/components/documents/DocumentUploadZone";
import { CaseAssigneesTagsInput } from "@/components/cases/CaseAssigneesTagsInput";
import { CaseCustomerPicker } from "@/components/cases/CaseCustomerPicker";
import { TeamSuggestionAddonGate } from "@/components/cases/TeamSuggestionAddonGate";
import { CUSTOMER_KIND_LABELS } from "@/components/customers/customer-kind-labels";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { usePermissions } from "@/lib/hooks/usePermissions";
import type { CasePriority, CaseStatus, TodoItemStatus } from "@syncora/shared";

const STATUS_LABELS: Record<CaseStatus, string> = {
  draft: "Brouillon",
  open: "Ouvert",
  in_progress: "En cours",
  waiting: "En attente",
  completed: "Terminé",
  cancelled: "Annulé",
};

const STATUS_COLORS: Record<CaseStatus, string> = {
  draft:
    "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  open: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  waiting: "bg-purple-50 text-purple-700 border-purple-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
};

const PRIORITY_LABELS: Record<CasePriority, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  urgent: "Urgente",
};

const STATUS_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  draft: ["open", "cancelled"],
  open: ["in_progress", "cancelled"],
  in_progress: ["waiting", "completed", "cancelled"],
  waiting: ["in_progress", "cancelled"],
  completed: ["open"],
  cancelled: ["draft"],
};

const INTERVENTION_STATUS_LABELS: Record<string, string> = {
  planned: "Planifiée",
  in_progress: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
};

const INTERVENTION_STATUS_COLORS: Record<string, string> = {
  planned: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
};

export function CaseDetailPage({ caseId }: { caseId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { can, canAny } = usePermissions();
  const canAssignCase = canAny(["cases.assign", "cases.update"]);
  const [showNewIntervention, setShowNewIntervention] = useState(false);
  const [editingInterventionId, setEditingInterventionId] = useState<string | null>(null);

  const { data: caseData, isLoading } = useQuery({
    queryKey: ["case", caseId],
    queryFn: () => api.getCase(caseId),
  });

  const { data: interventions } = useQuery({
    queryKey: ["interventions", caseId],
    queryFn: () => api.listInterventions({ caseId }),
  });

  const { data: usersData } = useQuery({
    queryKey: ["organization-users"],
    queryFn: () => listOrganizationUsers(),
  });

  const { data: teamsData } = useQuery({
    queryKey: ["teams"],
    queryFn: () => fleetApi.listTeams(),
  });

  const {
    data: agencesData,
    isLoading: agencesRoutingLoading,
    isError: agencesRoutingError,
  } = useQuery({
    queryKey: [
      "fleet-agences-for-routing",
      (teamsData ?? [])
        .map((t) => `${t.id}:${t.agenceId ?? ""}`)
        .sort()
        .join("|"),
    ],
    queryFn: () => fleetApi.resolveAgencesForTeams(teamsData ?? []),
    enabled: !!teamsData?.length && (showNewIntervention || !!editingInterventionId),
  });

  const { data: articles } = useQuery({
    queryKey: ["articles", "intervention-usage"],
    queryFn: () => stockApi.listArticles({ activeOnly: true }),
  });

  const { data: stockMovements } = useQuery({
    queryKey: ["stock-movements", caseId],
    queryFn: () => stockApi.listArticleMovements({ caseId, limit: 200 }),
  });

  const [newIntTitle, setNewIntTitle] = useState("");
  const [newIntDesc, setNewIntDesc] = useState("");
  const [newIntAssignee, setNewIntAssignee] = useState("");
  const [newIntTeamId, setNewIntTeamId] = useState("");
  const [newIntStart, setNewIntStart] = useState("");
  const [newIntEnd, setNewIntEnd] = useState("");
  const plannerCustomerId = caseData?.customerId;
  const { data: plannerCustomer, isLoading: plannerCustomerLoading } = useQuery({
    queryKey: ["customer", plannerCustomerId],
    queryFn: () => customersApi.getCustomer(plannerCustomerId!),
    enabled: !!plannerCustomerId && (showNewIntervention || !!editingInterventionId),
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPriority, setEditPriority] = useState<CasePriority>("medium");
  const [editAssigneeIds, setEditAssigneeIds] = useState<string[]>([]);
  const [editDueDate, setEditDueDate] = useState("");
  const [editCustomerId, setEditCustomerId] = useState("");
  const [editIntTeamId, setEditIntTeamId] = useState("");
  const [editIntAssignee, setEditIntAssignee] = useState("");
  const [editIntTitle, setEditIntTitle] = useState("");
  const [editIntDesc, setEditIntDesc] = useState("");
  const [editIntStart, setEditIntStart] = useState("");
  const [editIntEnd, setEditIntEnd] = useState("");
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
    onSuccess: invalidateAll,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: api.UpdateCasePayload) => api.updateCase(caseId, payload),
    onSuccess: () => {
      invalidateAll();
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteCase(caseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      router.push("/cases");
    },
  });

  const todoMutation = useMutation({
    mutationFn: (params: { stepId: string; todoId: string; status: TodoItemStatus }) =>
      api.updateTodo(caseId, params),
    onSuccess: invalidateAll,
  });

  const createInterventionMutation = useMutation({
    mutationFn: (payload: api.CreateInterventionPayload) => api.createIntervention(payload),
    onSuccess: () => {
      invalidateAll();
      setShowNewIntervention(false);
      setNewIntTitle("");
      setNewIntDesc("");
      setNewIntAssignee("");
      setNewIntTeamId("");
      setNewIntStart("");
      setNewIntEnd("");
      setInterventionError("");
    },
    onError: (err: Error) => setInterventionError(err.message),
  });

  const updateInterventionMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: api.UpdateInterventionPayload }) =>
      api.updateIntervention(id, payload),
    onSuccess: () => {
      invalidateAll();
      setInterventionError("");
    },
    onError: (err: Error) => setInterventionError(err.message),
  });

  const addInterventionArticleMutation = useMutation({
    mutationFn: ({
      interventionId,
      payload,
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
          note: "",
        },
      }));
    },
    onError: (err: Error) => setInterventionError(err.message),
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
        netQuantity: 0,
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
        netQuantity: value.netQuantity,
      });
      map.set(value.interventionId, existing);
    }
    return map;
  }, [articles, stockMovements]);

  const assigneePickerOptions = useMemo(() => {
    if (!caseData) return [] as { id: string; label: string }[];
    const map = new Map<string, string>();
    for (const u of usersData?.users ?? []) {
      map.set(u.id, u.name?.trim() || u.email);
    }
    for (const a of caseData.assignees) {
      if (!map.has(a.userId)) map.set(a.userId, a.name);
    }
    return [...map.entries()].map(([id, label]) => ({ id, label }));
  }, [caseData, usersData?.users]);

  if (isLoading || !caseData) {
    return <div className="text-sm text-slate-500 dark:text-slate-400">Chargement…</div>;
  }

  const allowedTransitions = STATUS_TRANSITIONS[caseData.status] ?? [];
  const isOverdue =
    caseData.dueDate &&
    new Date(caseData.dueDate) < new Date() &&
    caseData.status !== "completed" &&
    caseData.status !== "cancelled";

  const startEditing = () => {
    setEditTitle(caseData.title);
    setEditDesc(caseData.description ?? "");
    setEditPriority(caseData.priority);
    setEditAssigneeIds(caseData.assignees.map((a) => a.userId));
    setEditDueDate(caseData.dueDate ? caseData.dueDate.split("T")[0] : "");
    setEditCustomerId(caseData.customerId ?? "");
    setIsEditing(true);
  };

  const handleEditSubmit = () => {
    updateMutation.mutate({
      title: editTitle,
      description: editDesc || undefined,
      priority: editPriority,
      assigneeIds: editAssigneeIds,
      dueDate: editDueDate || null,
      customerId: editCustomerId.trim() ? editCustomerId.trim() : null,
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/cases"
            className="text-sm text-brand-600 dark:text-brand-400 hover:text-brand-500 font-medium"
          >
            &larr; Dossiers
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleEditSubmit}
                  disabled={updateMutation.isPending}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition"
                >
                  {updateMutation.isPending ? "…" : "Enregistrer"}
                </button>
              </>
            ) : can("cases.update") ? (
              <button
                type="button"
                onClick={startEditing}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Modifier
              </button>
            ) : null}
            {can("cases.delete") && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirm({
                    title: "Supprimer ce dossier ?",
                    description:
                      "Toutes les interventions liées seront supprimées définitivement. Cette action ne peut pas être annulée.",
                    confirmLabel: "Supprimer le dossier",
                    variant: "danger",
                  });
                  if (ok) deleteMutation.mutate();
                }}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition"
              >
                Supprimer
              </button>
            )}
          </div>
        </div>

        <div className="min-w-0">
          {isEditing ? (
            <div className="space-y-4 w-full">
              <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2.5 text-sm text-amber-950">
                <div className="flex flex-wrap items-center gap-2 font-medium text-amber-900">
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide">
                    Édition
                  </span>
                  <span>Modification des informations du dossier</span>
                </div>
                <p className="mt-1.5 text-xs text-amber-900/80 leading-relaxed">
                  Le <strong>statut</strong> ne se modifie pas ici : une fois revenu sur la fiche
                  (après enregistrement ou annulation), utilisez la section{" "}
                  <strong>Progression</strong>.
                </p>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300">
                <span className="text-slate-500 dark:text-slate-400">Dossier concerné :</span>{" "}
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {caseData.title}
                </span>
              </p>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm dark:shadow-slate-950/20 space-y-6">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Informations à mettre à jour
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Titre, description, priorité, échéance et personnes assignées. Pensez à
                    enregistrer vos changements.
                  </p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 xl:gap-10">
                  <div className="space-y-5 min-w-0">
                    <div>
                      <label
                        htmlFor="case-edit-title"
                        className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                      >
                        Titre du dossier
                      </label>
                      <input
                        id="case-edit-title"
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        placeholder="Ex. Rénovation immeuble rue des Lilas"
                      />
                    </div>

                    <div className="flex flex-col flex-1 min-h-0">
                      <label
                        htmlFor="case-edit-desc"
                        className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                      >
                        Description
                      </label>
                      <textarea
                        id="case-edit-desc"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        rows={8}
                        className="w-full min-h-[12rem] rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 xl:min-h-[14rem]"
                        placeholder="Contexte, objectifs, contraintes…"
                      />
                    </div>
                  </div>

                  <div className="space-y-5 min-w-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
                      <div>
                        <label
                          htmlFor="case-edit-priority"
                          className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                        >
                          Priorité
                        </label>
                        <select
                          id="case-edit-priority"
                          value={editPriority}
                          onChange={(e) => setEditPriority(e.target.value as CasePriority)}
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                          <option value="low">Basse</option>
                          <option value="medium">Moyenne</option>
                          <option value="high">Haute</option>
                          <option value="urgent">Urgente</option>
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor="case-edit-due"
                          className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                        >
                          Date d&apos;échéance
                        </label>
                        <input
                          id="case-edit-due"
                          type="date"
                          value={editDueDate}
                          onChange={(e) => setEditDueDate(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Laisser vide si aucune échéance fixée.
                        </p>
                      </div>
                    </div>

                    <div>
                      <span className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                        Personnes assignées
                      </span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                        Recherchez un membre de l&apos;organisation pour l&apos;ajouter ou retirez
                        un tag.
                      </p>
                      <CaseAssigneesTagsInput
                        options={assigneePickerOptions}
                        value={editAssigneeIds}
                        onChange={setEditAssigneeIds}
                        placeholder="Rechercher un membre à assigner…"
                      />
                    </div>

                    <CaseCustomerPicker
                      idPrefix="case-edit-customer"
                      value={editCustomerId}
                      initialDisplayName={caseData.customer?.displayName}
                      onChange={setEditCustomerId}
                      disabled={updateMutation.isPending}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <button
                    type="button"
                    onClick={handleEditSubmit}
                    disabled={updateMutation.isPending}
                    className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition"
                  >
                    {updateMutation.isPending ? "Enregistrement…" : "Enregistrer les modifications"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-semibold">{caseData.title}</h1>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[caseData.status]}`}
                >
                  {STATUS_LABELS[caseData.status]}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    caseData.priority === "urgent"
                      ? "bg-red-50 text-red-600"
                      : caseData.priority === "high"
                        ? "bg-orange-50 text-orange-600"
                        : caseData.priority === "medium"
                          ? "bg-blue-50 text-blue-600"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {PRIORITY_LABELS[caseData.priority]}
                </span>
                {isOverdue && (
                  <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                    En retard
                  </span>
                )}
              </div>
              {caseData.description && (
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {caseData.description}
                </p>
              )}
              {(caseData.customer || caseData.customerId) && (
                <div className="mt-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 p-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Client
                  </div>
                  {caseData.customer ? (
                    <>
                      <div className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {caseData.customer.displayName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {CUSTOMER_KIND_LABELS[caseData.customer.kind] ?? caseData.customer.kind}
                      </div>
                    </>
                  ) : (
                    <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      Référence client enregistrée
                    </div>
                  )}
                </div>
              )}
              <div className="mt-3 space-y-1.5">
                <span className="text-sm text-slate-500 dark:text-slate-400">Assignés</span>
                <CaseAssigneesTagsInput
                  options={assigneePickerOptions}
                  value={caseData.assignees.map((a) => a.userId)}
                  onChange={(ids) => updateMutation.mutate({ assigneeIds: ids })}
                  disabled={!canAssignCase || updateMutation.isPending}
                  placeholder="Rechercher un membre à assigner…"
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                {caseData.dueDate && (
                  <span>Échéance : {new Date(caseData.dueDate).toLocaleDateString("fr-FR")}</span>
                )}
                {caseData.tags.length > 0 && (
                  <span className="flex gap-1">
                    {caseData.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px]"
                      >
                        {t}
                      </span>
                    ))}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {!isEditing && (
        <>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm dark:shadow-slate-950/20">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Progression
              </div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {caseData.progress}%
              </div>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-full rounded-full transition-all ${
                  caseData.progress === 100 ? "bg-green-500" : "bg-brand-600"
                }`}
                style={{ width: `${caseData.progress}%` }}
              />
            </div>
            {can("cases.update") && allowedTransitions.length > 0 && (
              <div className="mt-3 flex gap-2 flex-wrap">
                <span className="text-xs text-slate-500 dark:text-slate-400 self-center">
                  Changer le statut :
                </span>
                {allowedTransitions.map((s) => (
                  <button
                    key={s}
                    onClick={() => statusMutation.mutate(s)}
                    disabled={statusMutation.isPending}
                    className={`rounded-lg border px-3 py-1 text-xs font-medium transition hover:shadow-sm dark:shadow-slate-950/20 ${STATUS_COLORS[s]}`}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {caseData.steps.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                Étapes & Tâches
              </h2>
              {[...caseData.steps]
                .sort((a, b) => a.order - b.order)
                .map((step) => {
                  const doneTodos = step.todos.filter(
                    (t) => t.status === "done" || t.status === "skipped",
                  ).length;
                  const totalTodos = step.todos.length;
                  const stepProgress =
                    totalTodos > 0 ? Math.round((doneTodos / totalTodos) * 100) : 0;

                  return (
                    <div
                      key={step.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm dark:shadow-slate-950/20"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600/10 text-xs font-semibold text-brand-600 dark:text-brand-400">
                            {step.order + 1}
                          </span>
                          <h3 className="font-semibold text-slate-700 dark:text-slate-200">
                            {step.name}
                          </h3>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {doneTodos}/{totalTodos} — {stepProgress}%
                        </span>
                      </div>
                      {step.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 ml-8">
                          {step.description}
                        </p>
                      )}
                      <div className="ml-8 space-y-1.5">
                        {step.todos.map((todo) => (
                          <div key={todo.id} className="flex items-center gap-2 group">
                            <button
                              type="button"
                              onClick={() => {
                                const newStatus: TodoItemStatus =
                                  todo.status === "done" ? "pending" : "done";
                                todoMutation.mutate({
                                  stepId: step.id,
                                  todoId: todo.id,
                                  status: newStatus,
                                });
                              }}
                              className={`h-4 w-4 rounded border flex-shrink-0 flex items-center justify-center transition ${
                                todo.status === "done"
                                  ? "bg-green-500 border-green-500 text-white"
                                  : todo.status === "skipped"
                                    ? "bg-slate-300 border-slate-300 dark:border-slate-600 text-white"
                                    : "border-slate-300 dark:border-slate-600 hover:border-brand-500"
                              }`}
                            >
                              {todo.status === "done" && (
                                <svg
                                  className="h-3 w-3"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={3}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </button>
                            <span
                              className={`text-sm ${
                                todo.status === "done"
                                  ? "text-slate-400 dark:text-slate-500 line-through"
                                  : todo.status === "skipped"
                                    ? "text-slate-400 dark:text-slate-500 line-through"
                                    : "text-slate-700 dark:text-slate-200"
                              }`}
                            >
                              {todo.label}
                            </span>
                            {todo.status === "pending" && (
                              <button
                                type="button"
                                onClick={() =>
                                  todoMutation.mutate({
                                    stepId: step.id,
                                    todoId: todo.id,
                                    status: "skipped",
                                  })
                                }
                                className="text-[10px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:text-slate-300 opacity-0 group-hover:opacity-100 transition"
                              >
                                ignorer
                              </button>
                            )}
                            {todo.completedAt && (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">
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
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                Interventions ({interventions?.length ?? 0})
              </h2>
              {can("interventions.create") && (
                <button
                  onClick={() => setShowNewIntervention(!showNewIntervention)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:bg-slate-800 transition self-start"
                >
                  {showNewIntervention ? "Annuler" : "+ Planifier une intervention"}
                </button>
              )}
            </div>

            {interventionError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {interventionError}
              </div>
            )}

            {showNewIntervention && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm dark:shadow-slate-950/20 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newIntTitle}
                    onChange={(e) => setNewIntTitle(e.target.value)}
                    placeholder="Titre de l'intervention"
                    className="sm:col-span-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  />
                  <textarea
                    value={newIntDesc}
                    onChange={(e) => setNewIntDesc(e.target.value)}
                    placeholder="Description (optionnelle)"
                    rows={2}
                    className="sm:col-span-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  />
                  <select
                    value={newIntTeamId}
                    onChange={(e) => setNewIntTeamId(e.target.value)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
                  >
                    <option value="">Équipe (aucune)</option>
                    {teamsData?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={newIntAssignee}
                    onChange={(e) => setNewIntAssignee(e.target.value)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
                  >
                    <option value="">Assignée à (personne)</option>
                    {usersData?.users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name ?? u.email}
                      </option>
                    ))}
                  </select>
                  {plannerCustomerLoading && plannerCustomerId ? (
                    <div className="sm:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-4 animate-pulse">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-3" />
                      <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                    </div>
                  ) : (
                    <div className="sm:col-span-2">
                      <TeamSuggestionAddonGate
                        teams={teamsData ?? []}
                        agences={agencesData ?? []}
                        agencesLoading={agencesRoutingLoading}
                        agencesError={agencesRoutingError}
                        customerLinked={Boolean(plannerCustomerId)}
                        customerAddress={plannerCustomer?.address}
                        selectedTeamId={newIntTeamId}
                        onSelectTeam={setNewIntTeamId}
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400">Début</label>
                    <input
                      type="datetime-local"
                      value={newIntStart}
                      onChange={(e) => setNewIntStart(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400">Fin</label>
                    <input
                      type="datetime-local"
                      value={newIntEnd}
                      onChange={(e) => setNewIntEnd(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
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
                      assignedTeamId: newIntTeamId || undefined,
                      scheduledStart: newIntStart ? new Date(newIntStart).toISOString() : undefined,
                      scheduledEnd: newIntEnd ? new Date(newIntEnd).toISOString() : undefined,
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
                  const isEditingThis = editingInterventionId === intervention.id;

                  const startEditingIntervention = () => {
                    setEditingInterventionId(intervention.id);
                    setEditIntTitle(intervention.title);
                    setEditIntDesc(intervention.description ?? "");
                    setEditIntTeamId(intervention.assignedTeamId ?? "");
                    setEditIntAssignee(intervention.assigneeId ?? "");
                    setEditIntStart(
                      intervention.scheduledStart
                        ? intervention.scheduledStart.slice(0, 16)
                        : "",
                    );
                    setEditIntEnd(
                      intervention.scheduledEnd
                        ? intervention.scheduledEnd.slice(0, 16)
                        : "",
                    );
                    setInterventionError("");
                  };

                  const cancelEditingIntervention = () => {
                    setEditingInterventionId(null);
                    setInterventionError("");
                  };

                  const submitEditIntervention = () => {
                    if (!editIntTitle.trim()) return;
                    updateInterventionMutation.mutate(
                      {
                        id: intervention.id,
                        payload: {
                          title: editIntTitle.trim(),
                          description: editIntDesc.trim() || undefined,
                          assignedTeamId: editIntTeamId || null,
                          assigneeId: editIntAssignee || null,
                          scheduledStart: editIntStart
                            ? new Date(editIntStart).toISOString()
                            : null,
                          scheduledEnd: editIntEnd
                            ? new Date(editIntEnd).toISOString()
                            : null,
                        },
                      },
                      { onSuccess: () => setEditingInterventionId(null) },
                    );
                  };

                  return (
                    <div
                      key={intervention.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-sm dark:shadow-slate-950/20"
                    >
                      {isEditingThis ? (
                        <div className="space-y-3">
                          <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-sm text-amber-950">
                            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide">
                              Édition
                            </span>{" "}
                            <span className="font-medium text-amber-900">Modifier l&apos;intervention</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                              type="text"
                              value={editIntTitle}
                              onChange={(e) => setEditIntTitle(e.target.value)}
                              placeholder="Titre de l'intervention"
                              className="sm:col-span-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                            />
                            <textarea
                              value={editIntDesc}
                              onChange={(e) => setEditIntDesc(e.target.value)}
                              placeholder="Description (optionnelle)"
                              rows={2}
                              className="sm:col-span-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                            />
                            <select
                              value={editIntTeamId}
                              onChange={(e) => setEditIntTeamId(e.target.value)}
                              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
                            >
                              <option value="">Équipe (aucune)</option>
                              {teamsData?.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                            <select
                              value={editIntAssignee}
                              onChange={(e) => setEditIntAssignee(e.target.value)}
                              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
                            >
                              <option value="">Assignée à (personne)</option>
                              {usersData?.users.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.name ?? u.email}
                                </option>
                              ))}
                            </select>
                            {plannerCustomerLoading && plannerCustomerId ? (
                              <div className="sm:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-4 animate-pulse">
                                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-3" />
                                <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                              </div>
                            ) : (
                              <div className="sm:col-span-2">
                                <TeamSuggestionAddonGate
                                  teams={teamsData ?? []}
                                  agences={agencesData ?? []}
                                  agencesLoading={agencesRoutingLoading}
                                  agencesError={agencesRoutingError}
                                  customerLinked={Boolean(plannerCustomerId)}
                                  customerAddress={plannerCustomer?.address}
                                  selectedTeamId={editIntTeamId}
                                  onSelectTeam={setEditIntTeamId}
                                />
                              </div>
                            )}
                            <div>
                              <label className="text-xs text-slate-500 dark:text-slate-400">Début</label>
                              <input
                                type="datetime-local"
                                value={editIntStart}
                                onChange={(e) => setEditIntStart(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-500 dark:text-slate-400">Fin</label>
                              <input
                                type="datetime-local"
                                value={editIntEnd}
                                onChange={(e) => setEditIntEnd(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={submitEditIntervention}
                              disabled={updateInterventionMutation.isPending}
                              className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition"
                            >
                              {updateInterventionMutation.isPending ? "…" : "Enregistrer"}
                            </button>
                            <button
                              onClick={cancelEditingIntervention}
                              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm text-slate-800 dark:text-slate-100">
                                {intervention.title}
                              </h4>
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                                  INTERVENTION_STATUS_COLORS[intervention.status] ?? ""
                                }`}
                              >
                                {INTERVENTION_STATUS_LABELS[intervention.status] ?? intervention.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {can("interventions.update") && (
                                <button
                                  onClick={startEditingIntervention}
                                  className="text-[10px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                                >
                                  Modifier
                                </button>
                              )}
                              {intervention.status === "planned" && (
                                <button
                                  onClick={() =>
                                    updateInterventionMutation.mutate({
                                      id: intervention.id,
                                      payload: { status: "in_progress" },
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
                                      payload: { status: "completed" },
                                    })
                                  }
                                  className="text-[10px] text-green-600 hover:text-green-700 px-1.5 py-0.5 rounded bg-green-50"
                                >
                                  Terminer
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                            {intervention.assignedTeamName && (
                              <span className="rounded bg-indigo-50 border border-indigo-200 text-indigo-700 px-1.5 py-0.5 text-xs">
                                {intervention.assignedTeamName}
                              </span>
                            )}
                            {intervention.assigneeName && <span>{intervention.assigneeName}</span>}
                            {intervention.scheduledStart && (
                              <span>
                                {new Date(intervention.scheduledStart).toLocaleDateString("fr-FR")}{" "}
                                {new Date(intervention.scheduledStart).toLocaleTimeString("fr-FR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            )}
                            {intervention.scheduledEnd && (
                              <span>
                                &rarr;{" "}
                                {new Date(intervention.scheduledEnd).toLocaleTimeString("fr-FR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            )}
                          </div>
                          {intervention.description && (
                            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                              {intervention.description}
                            </p>
                          )}

                          {usedArticles.length > 0 && (
                            <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-2">
                              <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 mb-1">
                                Articles liés à l&apos;intervention
                              </div>
                              <div className="space-y-1">
                                {usedArticles.map((item) => (
                                  <div
                                    key={item.articleId}
                                    className="flex flex-wrap items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 gap-1"
                                  >
                                    <span>
                                      {item.articleName}
                                      {item.articleReference ? ` (${item.articleReference})` : ""}
                                    </span>
                                    <span className="text-right">
                                      consommé: {item.consumedQuantity} / retourné:{" "}
                                      {item.returnedQuantity} / net: {item.netQuantity} {item.unit}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-2">
                            <div className="mb-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
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
                                      note: prev[intervention.id]?.note ?? "",
                                    },
                                  }))
                                }
                                className="rounded border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs"
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
                                      note: prev[intervention.id]?.note ?? "",
                                    },
                                  }))
                                }
                                className="rounded border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs"
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
                                      note: prev[intervention.id]?.note ?? "",
                                    },
                                  }))
                                }
                                className="rounded border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs"
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
                                      note: e.target.value,
                                    },
                                  }))
                                }
                                className="rounded border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs"
                                placeholder="Note (optionnelle)"
                              />
                            </div>
                            <div className="mt-2">
                              <button
                                onClick={() => {
                                  const draft = usageDrafts[intervention.id];
                                  if (!draft?.articleId) {
                                    setInterventionError(
                                      "Sélectionnez un article avant de valider le mouvement",
                                    );
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
                                      note: draft.note.trim() || undefined,
                                    },
                                  });
                                }}
                                disabled={addInterventionArticleMutation.isPending}
                                className="rounded bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition"
                              >
                                Enregistrer le mouvement
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              !showNewIntervention && (
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Aucune intervention planifiée pour ce dossier.
                </div>
              )
            )}
          </div>
        </>
      )}

      <DocumentUploadZone entityType="case" entityId={caseId} />
    </div>
  );
}
