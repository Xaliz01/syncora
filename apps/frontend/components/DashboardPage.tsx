"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthContext";
import { hasPermission } from "@/lib/auth-permissions";
import * as api from "@/lib/cases.api";
import type {
  CaseStatus,
  CasePriority,
  DashboardStatFilter,
  DashboardTodoCaseItem,
  DashboardTodoItem,
} from "@planwise/shared";
import { TrialTestDataCard } from "@/components/test-data/TrialTestDataCard";
import { ExportButton } from "@/components/ui/ExportButton";
import * as exportsApi from "@/lib/exports.api";

const STATUS_LABELS: Record<CaseStatus, string> = {
  draft: "Brouillon",
  open: "Ouvert",
  in_progress: "En cours",
  waiting: "En attente",
  completed: "Terminé",
  cancelled: "Annulé",
};

const STATUS_COLORS: Record<CaseStatus, string> = {
  draft: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300",
  open: "bg-blue-50 text-blue-700",
  in_progress: "bg-amber-50 text-amber-700",
  waiting: "bg-purple-50 text-purple-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-600",
};

const PRIORITY_LABELS: Record<CasePriority, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  urgent: "Urgente",
};

const PRIORITY_COLORS: Record<CasePriority, string> = {
  low: "text-slate-500",
  medium: "text-blue-600",
  high: "text-amber-600",
  urgent: "text-red-600",
};

const STAT_MODAL_TITLES: Record<DashboardStatFilter, string> = {
  assigned: "Dossiers assignés",
  in_progress: "Dossiers en cours",
  completed_week: "Dossiers terminés cette semaine",
  overdue: "Dossiers en retard",
  to_invoice: "Dossiers à facturer",
};

const DASHBOARD_CARD_LIST_PAGE_SIZE = 5;

/** Hauteur minimale commune des lignes (dossiers vs interventions) pour aligner les deux cartes. */
const DASHBOARD_LIST_ROW_CLASS =
  "flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-800 p-2.5 sm:p-3 min-h-[4.5rem] sm:min-h-[5.5rem] hover:bg-slate-50 dark:hover:bg-slate-800 transition";

function DashboardPaginatedList<T>({
  items,
  getKey,
  children,
  ariaLabel,
}: {
  items: T[];
  getKey: (item: T) => string;
  children: (item: T) => React.ReactNode;
  ariaLabel: string;
}) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(items.length / DASHBOARD_CARD_LIST_PAGE_SIZE));

  useEffect(() => {
    setPage(0);
  }, [items.length]);

  const safePage = Math.min(page, totalPages - 1);
  const start = safePage * DASHBOARD_CARD_LIST_PAGE_SIZE;
  const pageItems = items.slice(start, start + DASHBOARD_CARD_LIST_PAGE_SIZE);
  const showPager = items.length > DASHBOARD_CARD_LIST_PAGE_SIZE;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex flex-col gap-1.5 sm:gap-2 flex-1 min-h-0">
        {pageItems.map((item) => (
          <React.Fragment key={getKey(item)}>{children(item)}</React.Fragment>
        ))}
      </div>
      {showPager ? (
        <nav
          className="mt-auto flex shrink-0 items-center justify-between gap-1 sm:gap-2 pt-2 sm:pt-3 border-t border-slate-100 dark:border-slate-800"
          aria-label={ariaLabel}
        >
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="rounded-lg px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 disabled:opacity-40 disabled:pointer-events-none transition"
          >
            Précédent
          </button>
          <span className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {start + 1}–{Math.min(start + DASHBOARD_CARD_LIST_PAGE_SIZE, items.length)} sur{" "}
            {items.length}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
            className="rounded-lg px-2 sm:px-2.5 py-1 text-[11px] sm:text-xs font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 disabled:opacity-40 disabled:pointer-events-none transition"
          >
            Suivant
          </button>
        </nav>
      ) : null}
    </div>
  );
}

function DashboardCasesModal({
  title,
  subtitle,
  cases,
  isLoading,
  showDueDate,
  onClose,
  onExport,
}: {
  title: string;
  subtitle?: string;
  cases: DashboardTodoCaseItem[] | undefined;
  isLoading: boolean;
  showDueDate?: boolean;
  onClose: () => void;
  onExport?: (format: "pdf" | "xlsx" | "csv") => Promise<void>;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-4 max-h-[80vh] flex flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none"
            aria-label="Fermer"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {isLoading ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
              Chargement…
            </p>
          ) : !cases?.length ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
              Aucun dossier concerné.
            </p>
          ) : (
            <div className="space-y-2">
              {cases.map((c) => (
                <Link
                  key={c.caseId}
                  href={`/cases/${c.caseId}`}
                  onClick={onClose}
                  className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-800 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                        {c.caseTitle}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium flex-shrink-0 ${STATUS_COLORS[c.status]}`}
                      >
                        {STATUS_LABELS[c.status]}
                      </span>
                    </div>
                    {c.customerName && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        Client : {c.customerName}
                      </div>
                    )}
                    {showDueDate && c.dueDate && (
                      <div className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                        Échéance : {new Date(c.dueDate).toLocaleDateString("fr-FR")}
                      </div>
                    )}
                  </div>
                  <div className="ml-3 text-right flex-shrink-0">
                    <span className={`text-[10px] font-medium ${PRIORITY_COLORS[c.priority]}`}>
                      {PRIORITY_LABELS[c.priority]}
                    </span>
                    {c.createdAt && (
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">
                        {new Date(c.createdAt).toLocaleDateString("fr-FR")}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 px-5 py-3 flex justify-between">
          <div>
            {onExport && cases && cases.length > 0 && (
              <ExportButton onExport={onExport} label="Exporter" size="sm" />
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function TodoCasesModal({ todo, onClose }: { todo: DashboardTodoItem; onClose: () => void }) {
  const { data: cases, isLoading } = useQuery({
    queryKey: ["dashboard-todo-cases", todo.templateId, todo.todoLabel],
    queryFn: () => api.getDashboardTodoCases(todo.templateId, todo.todoLabel),
  });

  return (
    <DashboardCasesModal
      title={todo.todoLabel}
      subtitle={`${todo.templateName} — ${todo.stepName}`}
      cases={cases}
      isLoading={isLoading}
      onClose={onClose}
      onExport={(format) =>
        exportsApi.exportDashboardTodoCases(format, {
          templateId: todo.templateId,
          todoLabel: todo.todoLabel,
        })
      }
    />
  );
}

function StatCasesModal({ filter, onClose }: { filter: DashboardStatFilter; onClose: () => void }) {
  const { data: cases, isLoading } = useQuery({
    queryKey: ["dashboard-stat-cases", filter],
    queryFn: () => api.getDashboardStatCases(filter),
  });

  return (
    <DashboardCasesModal
      title={STAT_MODAL_TITLES[filter]}
      cases={cases}
      isLoading={isLoading}
      showDueDate={filter === "overdue"}
      onClose={onClose}
    />
  );
}

function DashboardStatCard({
  label,
  count,
  valueClassName,
  onCountClick,
}: {
  label: string;
  count: number;
  valueClassName: string;
  onCountClick: () => void;
}) {
  const clickable = count > 0;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm dark:shadow-slate-950/20">
      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</div>
      {clickable ? (
        <button
          type="button"
          onClick={onCountClick}
          className={`text-2xl font-bold tabular-nums rounded-md -ml-1 px-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition ${valueClassName}`}
          aria-label={`${label} : voir les ${count} dossiers`}
        >
          {count}
        </button>
      ) : (
        <div className={`text-2xl font-bold tabular-nums ${valueClassName}`}>{count}</div>
      )}
    </div>
  );
}

function DashboardTodoWidgets({ todos }: { todos: DashboardTodoItem[] }) {
  const [selectedTodo, setSelectedTodo] = useState<DashboardTodoItem | null>(null);

  return (
    <>
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm dark:shadow-slate-950/20">
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-3">
          Tâches à faire
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {todos.map((todo, idx) => (
            <button
              key={`${todo.templateId}-${todo.todoLabel}-${idx}`}
              onClick={() => setSelectedTodo(todo)}
              className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-800 p-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-left"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                  {todo.todoLabel}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {todo.templateName}
                </div>
              </div>
              <div className="ml-3 flex-shrink-0">
                <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-full bg-brand-600/10 text-sm font-semibold text-brand-600 dark:text-brand-400 px-2">
                  {todo.count}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedTodo && <TodoCasesModal todo={selectedTodo} onClose={() => setSelectedTodo(null)} />}
    </>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const [selectedStat, setSelectedStat] = useState<DashboardStatFilter | null>(null);

  const canReadCases = hasPermission(user, "cases.read");

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.getDashboard(),
    refetchInterval: 60000,
    enabled: canReadCases,
  });

  if (canReadCases && isLoading) {
    return (
      <div className="text-sm text-slate-500 dark:text-slate-400">
        Chargement du tableau de bord…
      </div>
    );
  }

  const stats = dashboard?.stats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold">
          Bonjour{user?.name ? `, ${user.name}` : ""}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Voici un résumé de votre activité et de vos tâches en cours.
        </p>
      </div>

      <TrialTestDataCard />

      {canReadCases && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm dark:shadow-slate-950/20">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-3">
            Actions rapides
          </h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/cases/new"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 transition"
            >
              Nouveau dossier
            </Link>
            <Link
              href="/cases"
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Tous les dossiers
            </Link>
            <Link
              href="/cases/calendar"
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Calendrier
            </Link>
            <Link
              href="/settings/case-templates"
              className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Modèles de dossier
            </Link>
          </div>
        </div>
      )}

      {canReadCases && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <DashboardStatCard
            label="Dossiers assignés"
            count={stats?.totalAssigned ?? 0}
            valueClassName="text-slate-800 dark:text-slate-100"
            onCountClick={() => setSelectedStat("assigned")}
          />
          <DashboardStatCard
            label="En cours"
            count={stats?.inProgress ?? 0}
            valueClassName="text-amber-600"
            onCountClick={() => setSelectedStat("in_progress")}
          />
          <DashboardStatCard
            label="Terminés cette semaine"
            count={stats?.completedThisWeek ?? 0}
            valueClassName="text-green-600"
            onCountClick={() => setSelectedStat("completed_week")}
          />
          <DashboardStatCard
            label="En retard"
            count={stats?.overdue ?? 0}
            valueClassName={
              (stats?.overdue ?? 0) > 0 ? "text-red-600" : "text-slate-800 dark:text-slate-100"
            }
            onCountClick={() => setSelectedStat("overdue")}
          />
        </div>
      )}

      {canReadCases && selectedStat && (
        <StatCasesModal filter={selectedStat} onClose={() => setSelectedStat(null)} />
      )}

      {canReadCases && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:items-stretch">
          <div className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 sm:p-4 shadow-sm dark:shadow-slate-950/20 overflow-hidden">
            <div className="flex shrink-0 items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                Mes dossiers actifs
              </h2>
              <Link
                href="/cases"
                className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-500 font-medium"
              >
                Voir tout
              </Link>
            </div>
            {!dashboard?.assignedCases?.length ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">Aucun dossier assigné.</p>
            ) : (
              <div className="flex flex-col flex-1 min-h-0">
                <DashboardPaginatedList
                  items={dashboard.assignedCases}
                  getKey={(c) => c.id}
                  ariaLabel="Pagination des dossiers actifs"
                >
                  {(c) => (
                    <Link href={`/cases/${c.id}`} className={DASHBOARD_LIST_ROW_CLASS}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 sm:gap-2">
                          <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                            {c.title}
                          </span>
                          <span
                            className={`rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] font-medium flex-shrink-0 ${STATUS_COLORS[c.status]}`}
                          >
                            {STATUS_LABELS[c.status]}
                          </span>
                        </div>
                        {c.customer?.displayName && (
                          <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            Client : {c.customer.displayName}
                          </div>
                        )}
                        {c.nextTodo && (
                          <div className="text-[11px] sm:text-xs text-amber-600 mt-0.5 truncate">
                            A faire : {c.nextTodo}
                          </div>
                        )}
                      </div>
                      <div className="ml-2 sm:ml-3 flex flex-col items-end flex-shrink-0">
                        <div className="text-[11px] sm:text-xs font-medium text-slate-600 dark:text-slate-300">
                          {c.progress}%
                        </div>
                        <div className="w-10 sm:w-12 h-1 rounded-full bg-slate-100 dark:bg-slate-800 mt-1">
                          <div
                            className="h-full rounded-full bg-brand-600"
                            style={{ width: `${c.progress}%` }}
                          />
                        </div>
                      </div>
                    </Link>
                  )}
                </DashboardPaginatedList>
              </div>
            )}
          </div>

          <div className="flex flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 sm:p-4 shadow-sm dark:shadow-slate-950/20 overflow-hidden">
            <div className="flex shrink-0 items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                Prochaines interventions
              </h2>
              <Link
                href="/cases/calendar"
                className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-500 font-medium"
              >
                Calendrier
              </Link>
            </div>
            {!dashboard?.upcomingInterventions?.length ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Aucune intervention à venir.
              </p>
            ) : (
              <div className="flex flex-col flex-1 min-h-0">
                <DashboardPaginatedList
                  items={dashboard.upcomingInterventions}
                  getKey={(i) => i.id}
                  ariaLabel="Pagination des prochaines interventions"
                >
                  {(i) => (
                    <Link href={`/cases/${i.caseId}`} className={DASHBOARD_LIST_ROW_CLASS}>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                          {i.title}
                        </div>
                        {i.caseTitle && (
                          <div className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {i.caseTitle}
                          </div>
                        )}
                      </div>
                      <div className="ml-2 sm:ml-3 text-right flex-shrink-0">
                        {i.scheduledStart && (
                          <div className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300">
                            {new Date(i.scheduledStart).toLocaleDateString("fr-FR")}
                          </div>
                        )}
                        {i.scheduledStart && (
                          <div className="text-[10px] text-slate-400 dark:text-slate-500">
                            {new Date(i.scheduledStart).toLocaleTimeString("fr-FR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        )}
                      </div>
                    </Link>
                  )}
                </DashboardPaginatedList>
              </div>
            )}
          </div>
        </div>
      )}

      {canReadCases && (dashboard?.todoWidgets?.length ?? 0) > 0 && (
        <DashboardTodoWidgets todos={dashboard!.todoWidgets} />
      )}
    </div>
  );
}
