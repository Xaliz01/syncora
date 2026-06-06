"use client";

import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthContext";
import { useToast } from "@/components/ui/ToastProvider";
import { PermissionGate } from "@/components/auth/PermissionGate";
import * as api from "@/lib/cases.api";
import type { GeoLocation, InterventionResponse, InterventionStatus } from "@syncora/shared";

const STATUS_LABELS: Record<InterventionStatus, string> = {
  planned: "Planifiée",
  in_progress: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
};

const STATUS_ICON: Record<InterventionStatus, string> = {
  planned: "◯",
  in_progress: "▶",
  completed: "✓",
  cancelled: "✕",
};

const STATUS_CARD_STYLES: Record<InterventionStatus, string> = {
  planned: "border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900",
  in_progress: "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/30",
  completed: "border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/20",
  cancelled: "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 opacity-60",
};

const STATUS_BADGE: Record<InterventionStatus, string> = {
  planned: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  cancelled: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

function formatTime(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(start?: string, end?: string): string | null {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h${m > 0 ? String(m).padStart(2, "0") : ""}`;
  return `${m}min`;
}

function getGeoLocation(): Promise<GeoLocation | undefined> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(undefined);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => resolve(undefined),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    );
  });
}

function InterventionCard({
  intervention,
  onStart,
  onComplete,
  isActing,
}: {
  intervention: InterventionResponse;
  onStart: (id: string) => void;
  onComplete: (id: string) => void;
  isActing: boolean;
}) {
  const status = intervention.status;
  const scheduleDuration = formatDuration(intervention.scheduledStart, intervention.scheduledEnd);
  const actualDuration = formatDuration(intervention.startedAt, intervention.completedAt);

  return (
    <div className={`rounded-xl border-2 p-4 transition-all ${STATUS_CARD_STYLES[status]}`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <Link
            href={`/cases/${intervention.caseId}`}
            className="text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-400 transition line-clamp-1"
          >
            {intervention.title}
          </Link>
          {intervention.caseTitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
              Dossier : {intervention.caseTitle}
            </p>
          )}
        </div>
        <span
          className={`inline-flex items-center gap-1 shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_BADGE[status]}`}
        >
          <span aria-hidden>{STATUS_ICON[status]}</span>
          {STATUS_LABELS[status]}
        </span>
      </div>

      {/* Schedule & timing info */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
        {intervention.scheduledStart && (
          <span className="inline-flex items-center gap-1">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
              <circle cx="12" cy="12" r="10" strokeWidth={2} fill="none" />
            </svg>
            {formatTime(intervention.scheduledStart)}
            {intervention.scheduledEnd && ` – ${formatTime(intervention.scheduledEnd)}`}
            {scheduleDuration && (
              <span className="text-slate-400 dark:text-slate-500">({scheduleDuration})</span>
            )}
          </span>
        )}
        {intervention.assigneeName && (
          <span className="inline-flex items-center gap-1">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0"
              />
            </svg>
            {intervention.assigneeName}
          </span>
        )}
        {intervention.assignedTeamName && (
          <span className="inline-flex items-center gap-1">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772"
              />
            </svg>
            {intervention.assignedTeamName}
          </span>
        )}
      </div>

      {/* Terrain timestamps */}
      {(intervention.startedAt || intervention.completedAt) && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {intervention.startedAt && (
            <span className="text-amber-600 dark:text-amber-400">
              Démarré à {formatTime(intervention.startedAt)}
            </span>
          )}
          {intervention.completedAt && (
            <span className="text-green-600 dark:text-green-400">
              Terminé à {formatTime(intervention.completedAt)}
              {actualDuration && ` (${actualDuration})`}
            </span>
          )}
        </div>
      )}

      {/* Notes */}
      {intervention.notes && (
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2 line-clamp-2">
          {intervention.notes}
        </p>
      )}

      {/* Description */}
      {intervention.description && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
          {intervention.description}
        </p>
      )}

      {/* Actions */}
      <PermissionGate permission="interventions.update">
        <div className="mt-3 flex gap-2">
          {status === "planned" && (
            <button
              onClick={() => onStart(intervention.id)}
              disabled={isActing}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-medium text-sm py-2.5 px-4 transition disabled:opacity-50 shadow-sm"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              {isActing ? "Démarrage…" : "Démarrer"}
            </button>
          )}
          {status === "in_progress" && (
            <button
              onClick={() => onComplete(intervention.id)}
              disabled={isActing}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-medium text-sm py-2.5 px-4 transition disabled:opacity-50 shadow-sm"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {isActing ? "Finalisation…" : "Terminer"}
            </button>
          )}
          {(status === "planned" || status === "in_progress") && (
            <Link
              href={`/cases/${intervention.caseId}`}
              className="flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm py-2.5 px-4 transition"
            >
              Détails
            </Link>
          )}
          {status === "completed" && (
            <Link
              href={`/cases/${intervention.caseId}`}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 text-sm py-2 px-4 transition hover:bg-green-100 dark:hover:bg-green-950/50"
            >
              Voir le dossier
            </Link>
          )}
        </div>
      </PermissionGate>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
        <svg
          className="h-8 w-8 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200 mb-1">
        Aucune intervention aujourd&apos;hui
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
        Vous n&apos;avez pas d&apos;intervention planifiée pour cette journée. Consultez le
        calendrier pour voir les interventions à venir.
      </p>
      <Link
        href="/cases/calendar"
        className="mt-4 inline-flex items-center gap-2 text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 font-medium"
      >
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
            d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
          />
        </svg>
        Voir le calendrier
      </Link>
    </div>
  );
}

type FilterTab = "all" | "todo" | "completed";

export function MyDayPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<FilterTab>("todo");
  const [actingOnId, setActingOnId] = useState<string | null>(null);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayEnd = useMemo(() => {
    const d = new Date(today);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [today]);

  const todayLabel = today.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const { data: interventions = [], isLoading } = useQuery({
    queryKey: ["my-day-interventions", user?.id, today.toISOString()],
    queryFn: () =>
      api.listInterventions({
        assigneeId: user!.id,
        startDate: today.toISOString(),
        endDate: todayEnd.toISOString(),
      }),
    enabled: !!user,
    refetchInterval: 30_000,
  });

  const filtered = useMemo(() => {
    if (activeFilter === "all") return interventions;
    if (activeFilter === "todo")
      return interventions.filter((i) => i.status === "planned" || i.status === "in_progress");
    return interventions.filter((i) => i.status === "completed" || i.status === "cancelled");
  }, [interventions, activeFilter]);

  const stats = useMemo(() => {
    const todo = interventions.filter(
      (i) => i.status === "planned" || i.status === "in_progress",
    ).length;
    const done = interventions.filter((i) => i.status === "completed").length;
    const inProgress = interventions.filter((i) => i.status === "in_progress").length;
    return { total: interventions.length, todo, done, inProgress };
  }, [interventions]);

  const invalidateQueries = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["my-day-interventions"] });
  }, [queryClient]);

  const startMutation = useMutation({
    mutationFn: async (interventionId: string) => {
      setActingOnId(interventionId);
      const location = await getGeoLocation();
      return api.startIntervention(interventionId, { location });
    },
    onSuccess: () => {
      showToast("Intervention démarrée", "success");
      invalidateQueries();
    },
    onError: () => {
      showToast("Erreur lors du démarrage de l'intervention", "error");
    },
    onSettled: () => setActingOnId(null),
  });

  const completeMutation = useMutation({
    mutationFn: async (interventionId: string) => {
      setActingOnId(interventionId);
      const location = await getGeoLocation();
      return api.completeIntervention(interventionId, { location });
    },
    onSuccess: () => {
      showToast("Intervention terminée", "success");
      invalidateQueries();
    },
    onError: () => {
      showToast("Erreur lors de la finalisation de l'intervention", "error");
    },
    onSettled: () => setActingOnId(null),
  });

  const handleStart = useCallback((id: string) => startMutation.mutate(id), [startMutation]);

  const handleComplete = useCallback(
    (id: string) => completeMutation.mutate(id),
    [completeMutation],
  );

  const filterTabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "todo", label: "À faire", count: stats.todo },
    { key: "completed", label: "Terminées", count: stats.done },
    { key: "all", label: "Toutes", count: stats.total },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 dark:text-slate-100">
          Ma journée
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 capitalize">{todayLabel}</p>
      </div>

      {/* Stats summary */}
      {stats.total > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-center">
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{stats.todo}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {stats.todo > 1 ? "à faire" : "à faire"}
            </p>
          </div>
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-center">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats.inProgress}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">en cours</p>
          </div>
          <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20 p-3 text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.done}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {stats.done > 1 ? "terminées" : "terminée"}
            </p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      {stats.total > 0 && (
        <div className="flex gap-1 mb-5 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-md transition ${
                activeFilter === tab.key
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              {tab.label}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeFilter === tab.key
                    ? "bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-300"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      ) : filtered.length === 0 && stats.total === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-8">
          Aucune intervention dans cette catégorie.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((intervention) => (
            <InterventionCard
              key={intervention.id}
              intervention={intervention}
              onStart={handleStart}
              onComplete={handleComplete}
              isActing={actingOnId === intervention.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
