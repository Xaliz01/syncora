"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/cases.api";
import type { CaseHistoryAction, CaseHistoryChange } from "@syncora/shared";

const ACTION_CONFIG: Record<
  CaseHistoryAction,
  { label: string; icon: React.ReactNode; color: string }
> = {
  case_created: {
    label: "Dossier créé",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
    color: "text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400",
  },
  case_updated: {
    label: "Dossier modifié",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z"
        />
      </svg>
    ),
    color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400",
  },
  status_changed: {
    label: "Statut modifié",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
        />
      </svg>
    ),
    color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400",
  },
  priority_changed: {
    label: "Priorité modifiée",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
        />
      </svg>
    ),
    color: "text-orange-600 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-400",
  },
  assignees_changed: {
    label: "Assignation modifiée",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
        />
      </svg>
    ),
    color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 dark:text-indigo-400",
  },
  customer_changed: {
    label: "Client modifié",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
        />
      </svg>
    ),
    color: "text-purple-600 bg-purple-50 dark:bg-purple-950/30 dark:text-purple-400",
  },
  todo_updated: {
    label: "Tâche mise à jour",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
      </svg>
    ),
    color: "text-teal-600 bg-teal-50 dark:bg-teal-950/30 dark:text-teal-400",
  },
  intervention_created: {
    label: "Intervention créée",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z"
        />
      </svg>
    ),
    color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-950/30 dark:text-cyan-400",
  },
  intervention_updated: {
    label: "Intervention modifiée",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z"
        />
      </svg>
    ),
    color: "text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400",
  },
  intervention_deleted: {
    label: "Intervention supprimée",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
        />
      </svg>
    ),
    color: "text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400",
  },
  document_uploaded: {
    label: "Document ajouté",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
        />
      </svg>
    ),
    color: "text-violet-600 bg-violet-50 dark:bg-violet-950/30 dark:text-violet-400",
  },
  document_deleted: {
    label: "Document supprimé",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12H9.75m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
        />
      </svg>
    ),
    color: "text-red-500 bg-red-50 dark:bg-red-950/30 dark:text-red-400",
  },
  case_deleted: {
    label: "Dossier supprimé",
    icon: (
      <svg
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
        />
      </svg>
    ),
    color: "text-red-700 bg-red-100 dark:bg-red-950/40 dark:text-red-400",
  },
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  open: "Ouvert",
  in_progress: "En cours",
  waiting: "En attente",
  completed: "Terminé",
  cancelled: "Annulé",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  urgent: "Urgente",
};

const TODO_STATUS_LABELS: Record<string, string> = {
  pending: "À faire",
  done: "Terminée",
  skipped: "Ignorée",
};

const FIELD_LABELS: Record<string, string> = {
  title: "Titre",
  description: "Description",
  status: "Statut",
  priority: "Priorité",
  assignees: "Assignés",
  dueDate: "Échéance",
  customer: "Client",
};

function formatFieldValue(field: string, value?: string): string {
  if (!value) return "—";
  if (field === "status") return STATUS_LABELS[value] ?? value;
  if (field === "priority") return PRIORITY_LABELS[value] ?? value;
  if (field === "status" && TODO_STATUS_LABELS[value]) return TODO_STATUS_LABELS[value];
  return value;
}

function ChangesList({ changes }: { changes: CaseHistoryChange[] }) {
  if (!changes.length) return null;
  return (
    <div className="mt-2 space-y-1">
      {changes.map((c, i) => (
        <div key={i} className="flex flex-wrap items-baseline gap-1.5 text-xs">
          <span className="font-medium text-slate-600 dark:text-slate-300">
            {FIELD_LABELS[c.field] ?? c.field}
          </span>
          {c.oldValue ? (
            <>
              <span className="text-slate-400 dark:text-slate-500 line-through">
                {formatFieldValue(c.field, c.oldValue)}
              </span>
              <span className="text-slate-400 dark:text-slate-500">&rarr;</span>
            </>
          ) : null}
          <span className="text-slate-700 dark:text-slate-200">
            {formatFieldValue(c.field, c.newValue)}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function CaseHistory({ caseId }: { caseId: string }) {
  const { data: history, isLoading } = useQuery({
    queryKey: ["case-history", caseId],
    queryFn: () => api.listCaseHistory(caseId),
  });

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
        Historique du dossier
      </h2>

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm dark:shadow-slate-950/20">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : !history || history.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm dark:shadow-slate-950/20 text-center">
          <svg
            className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Aucun historique pour ce dossier.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm dark:shadow-slate-950/20 overflow-hidden">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {history.map((entry, idx) => {
              const config = ACTION_CONFIG[entry.action] ?? ACTION_CONFIG.case_updated;
              return (
                <div key={entry.id} className="relative flex gap-3 px-4 py-3 sm:px-5 sm:py-4">
                  {idx < history.length - 1 && (
                    <div className="absolute left-[1.9rem] sm:left-[2.15rem] top-12 bottom-0 w-px bg-slate-100 dark:bg-slate-800" />
                  )}
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.color}`}
                  >
                    {config.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                        {entry.actorName}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {config.label}
                      </span>
                      {entry.details && (
                        <span className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[200px]">
                          — {entry.details}
                        </span>
                      )}
                    </div>
                    <p
                      className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500"
                      title={new Date(entry.createdAt).toLocaleString("fr-FR")}
                    >
                      {formatRelativeTime(entry.createdAt)}
                    </p>
                    {entry.changes && entry.changes.length > 0 && (
                      <ChangesList changes={entry.changes} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
