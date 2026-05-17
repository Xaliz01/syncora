"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { CaseStatus, CaseStep, TodoItemStatus } from "@syncora/shared";

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
  open: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  in_progress:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  waiting:
    "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
  completed:
    "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800",
  cancelled:
    "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
};

type StepPhase = "complete" | "current" | "upcoming";

function stepProgress(step: CaseStep): number {
  const done = step.todos.filter((t) => t.status === "done" || t.status === "skipped").length;
  return step.todos.length > 0 ? Math.round((done / step.todos.length) * 100) : 0;
}

function stepPhase(step: CaseStep, index: number, sortedSteps: CaseStep[]): StepPhase {
  const p = stepProgress(step);
  if (p === 100) return "complete";
  const allPreviousDone = sortedSteps
    .slice(0, index)
    .every((s) => stepProgress(s) === 100 || s.todos.length === 0);
  if (allPreviousDone) return "current";
  return "upcoming";
}

function nodeClasses(phase: StepPhase): string {
  if (phase === "complete") {
    return "border-green-500 bg-green-500 text-white shadow-sm shadow-green-500/30";
  }
  if (phase === "current") {
    return "border-brand-500 bg-brand-600 text-white ring-4 ring-brand-500/20 shadow-sm shadow-brand-600/25";
  }
  return "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-500";
}

function connectorClasses(leftPhase: StepPhase, rightPhase: StepPhase): string {
  if (leftPhase === "complete" && (rightPhase === "complete" || rightPhase === "current")) {
    return "bg-green-500";
  }
  if (leftPhase === "complete" || leftPhase === "current") {
    return "bg-gradient-to-r from-brand-500 to-slate-200 dark:to-slate-700";
  }
  return "bg-slate-200 dark:bg-slate-700";
}

function StepCheckIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function TodoCheckIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={3}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function TodoRow({
  todo,
  canUpdateTodos,
  onToggle,
  onSkip,
}: {
  todo: CaseStep["todos"][number];
  canUpdateTodos: boolean;
  onToggle: () => void;
  onSkip: () => void;
}) {
  const isDone = todo.status === "done";
  const isSkipped = todo.status === "skipped";
  const isPending = todo.status === "pending";

  return (
    <li
      className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 transition ${
        isDone
          ? "border-green-200/80 bg-green-50/50 dark:border-green-900/50 dark:bg-green-950/20"
          : isSkipped
            ? "border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/40"
            : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 shadow-sm dark:shadow-slate-950/10"
      }`}
    >
      <button
        type="button"
        disabled={!canUpdateTodos}
        onClick={onToggle}
        aria-label={isDone ? "Marquer comme à faire" : "Marquer comme terminée"}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
          !canUpdateTodos ? "cursor-default opacity-60" : "hover:scale-105"
        } ${
          isDone
            ? "border-green-500 bg-green-500 text-white"
            : isSkipped
              ? "border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700"
              : "border-slate-300 dark:border-slate-600 hover:border-brand-500"
        }`}
      >
        {isDone && <TodoCheckIcon />}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm leading-snug ${
            isDone || isSkipped
              ? "text-slate-500 dark:text-slate-400 line-through"
              : "font-medium text-slate-800 dark:text-slate-100"
          }`}
        >
          {todo.label}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {isSkipped && (
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              Ignorée
            </span>
          )}
          {isDone && todo.completedAt && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              Terminée le {new Date(todo.completedAt).toLocaleDateString("fr-FR")}
            </span>
          )}
        </div>
      </div>
      {canUpdateTodos && isPending && (
        <button
          type="button"
          onClick={onSkip}
          className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
        >
          Ignorer
        </button>
      )}
    </li>
  );
}

export function CaseProgressTimeline({
  progress,
  steps,
  canUpdateStatus,
  allowedTransitions,
  onStatusChange,
  statusChangePending,
  canUpdateTodos,
  onTodoStatusChange,
  title,
  titleBadges,
  description,
  details,
  meta,
}: {
  progress: number;
  steps: CaseStep[];
  canUpdateStatus: boolean;
  allowedTransitions: CaseStatus[];
  onStatusChange: (status: CaseStatus) => void;
  statusChangePending: boolean;
  canUpdateTodos: boolean;
  onTodoStatusChange: (stepId: string, todoId: string, status: TodoItemStatus) => void;
  title: string;
  titleBadges?: React.ReactNode;
  description?: string;
  details?: React.ReactNode;
  meta?: React.ReactNode;
}) {
  const sortedSteps = useMemo(() => [...steps].sort((a, b) => a.order - b.order), [steps]);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);

  useEffect(() => {
    if (sortedSteps.length === 0) {
      setExpandedStepId(null);
      return;
    }
    const current = sortedSteps.find((s, i) => stepPhase(s, i, sortedSteps) === "current");
    setExpandedStepId(current?.id ?? sortedSteps[sortedSteps.length - 1]?.id ?? null);
  }, [sortedSteps]);

  const expandedStep = sortedSteps.find((s) => s.id === expandedStepId);
  const expandedIndex = expandedStep ? sortedSteps.findIndex((s) => s.id === expandedStep.id) : -1;

  return (
    <header className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm dark:shadow-slate-950/20 overflow-hidden">
      <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white">
                {title}
              </h1>
              {titleBadges}
            </div>
            {description ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-3xl">{description}</p>
            ) : null}
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end shrink-0 lg:min-w-[12rem]">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
                {progress}%
              </span>
              <div className="h-2.5 flex-1 sm:w-36 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden min-w-[6rem]">
                <div
                  className={`h-full rounded-full transition-all ${
                    progress === 100 ? "bg-green-500" : "bg-brand-600"
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            {canUpdateStatus && allowedTransitions.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 w-full sm:w-auto sm:mr-1">
                  Statut
                </span>
                {allowedTransitions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onStatusChange(s)}
                    disabled={statusChangePending}
                    className={`rounded-md border px-2 py-0.5 text-[11px] font-medium transition hover:shadow-sm disabled:opacity-50 ${STATUS_COLORS[s]}`}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {(details || meta) && (
        <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-4 sm:px-6 space-y-4">
          {details}
          {meta ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
              {meta}
            </div>
          ) : null}
        </div>
      )}

      {sortedSteps.length > 0 ? (
        <>
          <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-5 sm:px-6">
            <div className="flex w-full items-start">
              {sortedSteps.map((step, index) => {
                const phase = stepPhase(step, index, sortedSteps);
                const p = stepProgress(step);
                const isSelected = expandedStepId === step.id;
                const doneCount = step.todos.filter(
                  (t) => t.status === "done" || t.status === "skipped",
                ).length;
                const prevPhase =
                  index > 0 ? stepPhase(sortedSteps[index - 1], index - 1, sortedSteps) : null;

                return (
                  <React.Fragment key={step.id}>
                    {index > 0 && (
                      <div
                        className="flex flex-1 min-w-6 max-w-40 items-center self-start pt-[1.125rem]"
                        aria-hidden
                      >
                        <div
                          className={`h-1 w-full rounded-full ${connectorClasses(prevPhase!, phase)}`}
                        />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setExpandedStepId(step.id)}
                      aria-current={isSelected ? "step" : undefined}
                      className={`group flex flex-1 min-w-0 flex-col items-center px-1 sm:px-2 text-center transition ${
                        isSelected ? "opacity-100" : "opacity-85 hover:opacity-100"
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold transition ${nodeClasses(phase)} ${
                          isSelected ? "scale-110" : "group-hover:scale-105"
                        }`}
                      >
                        {phase === "complete" ? <StepCheckIcon /> : index + 1}
                      </span>
                      <span
                        className={`mt-2 w-full text-xs sm:text-sm font-medium leading-tight line-clamp-2 ${
                          isSelected
                            ? "text-brand-600 dark:text-brand-400"
                            : "text-slate-700 dark:text-slate-200"
                        }`}
                        title={step.name}
                      >
                        {step.name}
                      </span>
                      <span className="mt-1 text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
                        {step.todos.length > 0
                          ? `${doneCount}/${step.todos.length} · ${p}%`
                          : "Sans tâche"}
                      </span>
                      {step.todos.length > 0 && (
                        <span className="mt-2 h-1 w-full max-w-[4.5rem] rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <span
                            className={`block h-full rounded-full transition-all ${
                              p === 100 ? "bg-green-500" : "bg-brand-500"
                            }`}
                            style={{ width: `${p}%` }}
                          />
                        </span>
                      )}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {expandedStep && (
            <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/40 px-4 py-4 sm:px-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    Étape {expandedIndex + 1} sur {sortedSteps.length}
                  </p>
                  <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                    {expandedStep.name}
                  </h2>
                </div>
                {expandedStep.todos.length > 0 && (
                  <span className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                    {
                      expandedStep.todos.filter(
                        (t) => t.status === "done" || t.status === "skipped",
                      ).length
                    }
                    /{expandedStep.todos.length} tâches
                  </span>
                )}
              </div>
              {expandedStep.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                  {expandedStep.description}
                </p>
              )}
              {expandedStep.todos.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                  Aucune tâche pour cette étape.
                </p>
              ) : (
                <ul className="space-y-2 max-w-3xl">
                  {expandedStep.todos.map((todo) => (
                    <TodoRow
                      key={todo.id}
                      todo={todo}
                      canUpdateTodos={canUpdateTodos}
                      onToggle={() => {
                        if (!canUpdateTodos) return;
                        onTodoStatusChange(
                          expandedStep.id,
                          todo.id,
                          todo.status === "done" ? "pending" : "done",
                        );
                      }}
                      onSkip={() => onTodoStatusChange(expandedStep.id, todo.id, "skipped")}
                    />
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="px-4 py-4 sm:px-6 text-sm text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
          Aucune étape définie — la progression repose sur le statut global du dossier.
        </div>
      )}
    </header>
  );
}
