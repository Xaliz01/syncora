"use client";

import React, { useCallback, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/cases.api";
import type { InterventionResponse } from "@syncora/shared";

type ViewMode = "week" | "month";

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);
const CELL_HEIGHT = 48;

function getWeekDays(referenceDate: Date): Date[] {
  const d = new Date(referenceDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  });
}

function getMonthDays(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const weeks: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = Array(startDow).fill(null);

  for (let d = 1; d <= lastDay.getDate(); d++) {
    currentWeek.push(new Date(year, month, d));
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }
  return weeks;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const STATUS_DOT: Record<string, string> = {
  planned: "bg-blue-500",
  in_progress: "bg-amber-500",
  completed: "bg-green-500",
  cancelled: "bg-red-400",
};

const STATUS_LABEL: Record<string, string> = {
  planned: "Planifiée",
  in_progress: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
};

function statusClasses(status: string): string {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800 border border-green-200";
    case "in_progress":
      return "bg-amber-100 text-amber-800 border border-amber-200";
    default:
      return "bg-blue-100 text-blue-800 border border-blue-200";
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Unscheduled Panel
// ────────────────────────────────────────────────────────────────────────────

function UnscheduledPanel({
  onDragStart,
  onDropToUnschedule,
  onClickIntervention,
}: {
  onDragStart: (e: React.DragEvent, intervention: InterventionResponse) => void;
  onDropToUnschedule: (interventionId: string) => void;
  onClickIntervention: (intervention: InterventionResponse) => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [dropHover, setDropHover] = useState(false);
  const dragCounterRef = useRef(0);

  const { data: unscheduledInterventions, isLoading } = useQuery({
    queryKey: ["unscheduled-interventions"],
    queryFn: () => api.listInterventions({ unscheduled: "true" }),
  });

  const filtered = useMemo(() => {
    if (!unscheduledInterventions) return [];
    if (!searchTerm.trim()) return unscheduledInterventions;
    const lower = searchTerm.toLowerCase();
    return unscheduledInterventions.filter(
      (i) =>
        i.title.toLowerCase().includes(lower) ||
        (i.caseTitle && i.caseTitle.toLowerCase().includes(lower)),
    );
  }, [unscheduledInterventions, searchTerm]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    setDropHover(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setDropHover(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setDropHover(false);
    const interventionId = e.dataTransfer.getData("text/plain");
    if (interventionId) {
      onDropToUnschedule(interventionId);
    }
  };

  // Collapsed state – still acts as a drop zone
  if (collapsed) {
    return (
      <div
        className={`flex-shrink-0 flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-2 transition-colors ${
          dropHover
            ? "border-brand-600 bg-brand-50"
            : "border-slate-200 bg-white"
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition"
          title="Afficher les interventions non planifiées"
        >
          <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        {dropHover && (
          <span className="text-[10px] text-brand-600 font-medium whitespace-nowrap">Déplanifier</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex-shrink-0 w-72 xl:w-80 rounded-xl border-2 shadow-sm flex flex-col max-h-[calc(100vh-220px)] transition-colors ${
        dropHover
          ? "border-brand-600 bg-brand-50/30"
          : "border-slate-200 bg-white"
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-brand-600/10">
            <svg className="w-3.5 h-3.5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xs font-semibold text-slate-700">Non planifiées</h3>
          {unscheduledInterventions && (
            <span className="text-[10px] font-medium text-slate-400 bg-slate-100 rounded-full px-1.5 py-0.5">
              {unscheduledInterventions.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 rounded hover:bg-slate-100 transition"
          title="Réduire le panneau"
        >
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-slate-100">
        <div className="relative">
          <svg
            className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600"
          />
        </div>
      </div>

      {/* Drop overlay feedback */}
      {dropHover && (
        <div className="px-3 py-3 flex items-center justify-center gap-2 border-b border-brand-200 bg-brand-50">
          <svg className="w-4 h-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
          </svg>
          <span className="text-xs font-medium text-brand-600">
            Déposez ici pour déplanifier
          </span>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-slate-200 border-t-brand-600 rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && filtered.length === 0 && !dropHover && (
          <div className="text-center py-8">
            <svg className="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-slate-400">
              {searchTerm ? "Aucun résultat" : "Toutes les interventions sont planifiées"}
            </p>
          </div>
        )}

        {filtered.map((intervention) => (
          <div
            key={intervention.id}
            draggable
            onDragStart={(e) => onDragStart(e, intervention)}
            className="group rounded-lg border border-slate-200 bg-white p-2.5 cursor-grab active:cursor-grabbing hover:border-brand-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start gap-2">
              <div className="mt-1 flex-shrink-0">
                <svg className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-500 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-medium text-slate-800 truncate">{intervention.title}</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClickIntervention(intervention);
                    }}
                    className="flex-shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-100 transition"
                    title="Voir la fiche"
                  >
                    <svg className="w-3.5 h-3.5 text-slate-400 hover:text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </button>
                </div>
                {intervention.caseTitle && (
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">{intervention.caseTitle}</p>
                )}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      intervention.status === "planned"
                        ? "bg-blue-50 text-blue-700"
                        : intervention.status === "in_progress"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-50 text-slate-600"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[intervention.status] ?? "bg-slate-400"}`} />
                    {STATUS_LABEL[intervention.status] ?? intervention.status}
                  </span>
                  {intervention.assigneeName && (
                    <span className="text-[10px] text-slate-400 truncate">{intervention.assigneeName}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 text-center">
          Glissez depuis/vers le calendrier pour planifier/déplanifier
        </p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Calendar Page
// ────────────────────────────────────────────────────────────────────────────

export function CalendarPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewMode>("week");
  const [referenceDate, setReferenceDate] = useState(new Date());
  const dragRef = useRef<{
    intervention: InterventionResponse;
    originDate: Date | null;
  } | null>(null);
  const [resizePreview, setResizePreview] = useState<{
    id: string;
    deltaHours: number;
  } | null>(null);
  const justResizedRef = useRef(false);

  const weekDays = useMemo(() => getWeekDays(referenceDate), [referenceDate]);
  const monthWeeks = useMemo(
    () => getMonthDays(referenceDate.getFullYear(), referenceDate.getMonth()),
    [referenceDate],
  );

  const rangeStart = useMemo(() => {
    if (view === "week") {
      const d = new Date(weekDays[0]);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    return new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  }, [view, weekDays, referenceDate]);

  const rangeEnd = useMemo(() => {
    if (view === "week") {
      const d = new Date(weekDays[6]);
      d.setHours(23, 59, 59, 999);
      return d;
    }
    return new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth() + 1,
      0,
      23, 59, 59, 999,
    );
  }, [view, weekDays, referenceDate]);

  const { data: interventions } = useQuery({
    queryKey: ["calendar-interventions", rangeStart.toISOString(), rangeEnd.toISOString()],
    queryFn: () =>
      api.listInterventions({
        startDate: rangeStart.toISOString(),
        endDate: rangeEnd.toISOString(),
      }),
  });

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["calendar-interventions"] });
    queryClient.invalidateQueries({ queryKey: ["unscheduled-interventions"] });
  }, [queryClient]);

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: api.UpdateInterventionPayload }) =>
      api.updateIntervention(id, payload),
    onSuccess: invalidateAll,
  });

  // ── Navigation ──

  const navigate = (direction: number) => {
    const d = new Date(referenceDate);
    if (view === "week") d.setDate(d.getDate() + direction * 7);
    else d.setMonth(d.getMonth() + direction);
    setReferenceDate(d);
  };

  const goToday = () => setReferenceDate(new Date());

  const getInterventionsForDay = useCallback(
    (date: Date) =>
      (interventions ?? []).filter((i) => {
        if (!i.scheduledStart) return false;
        return isSameDay(new Date(i.scheduledStart), date);
      }),
    [interventions],
  );

  // ── Drag & drop (move / schedule / unschedule) ──

  const handleDragStart = useCallback(
    (e: React.DragEvent, intervention: InterventionResponse) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", intervention.id);
      dragRef.current = {
        intervention,
        originDate: intervention.scheduledStart
          ? new Date(intervention.scheduledStart)
          : null,
      };
    },
    [],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, targetDate: Date, targetHour?: number) => {
      e.preventDefault();
      if (!dragRef.current) return;
      const { intervention, originDate } = dragRef.current;

      const newStart = new Date(targetDate);
      if (targetHour !== undefined) {
        newStart.setHours(targetHour, 0, 0, 0);
      } else if (originDate) {
        newStart.setHours(originDate.getHours(), originDate.getMinutes(), 0, 0);
      } else {
        newStart.setHours(9, 0, 0, 0);
      }

      let newEnd: string | undefined;
      if (intervention.scheduledStart && intervention.scheduledEnd) {
        const duration =
          new Date(intervention.scheduledEnd).getTime() -
          new Date(intervention.scheduledStart).getTime();
        newEnd = new Date(newStart.getTime() + duration).toISOString();
      } else if (!intervention.scheduledStart) {
        newEnd = new Date(newStart.getTime() + 60 * 60 * 1000).toISOString();
      }

      updateMutation.mutate({
        id: intervention.id,
        payload: {
          scheduledStart: newStart.toISOString(),
          scheduledEnd: newEnd,
        },
      });

      dragRef.current = null;
    },
    [updateMutation],
  );

  const handleDropToUnschedule = useCallback(
    (interventionId: string) => {
      updateMutation.mutate({
        id: interventionId,
        payload: {
          scheduledStart: null,
          scheduledEnd: null,
        },
      });
      dragRef.current = null;
    },
    [updateMutation],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  // ── Navigate to intervention detail ──

  const navigateToIntervention = useCallback(
    (intervention: InterventionResponse) => {
      if (justResizedRef.current) return;
      router.push(`/cases/${intervention.caseId}#intervention-${intervention.id}`);
    },
    [router],
  );

  // ── Resize (week view) ──

  const getCardHeight = useCallback(
    (intervention: InterventionResponse): number => {
      let durationHours = 1;
      if (intervention.scheduledStart && intervention.scheduledEnd) {
        durationHours =
          (new Date(intervention.scheduledEnd).getTime() -
            new Date(intervention.scheduledStart).getTime()) /
          (60 * 60 * 1000);
      }
      if (resizePreview && resizePreview.id === intervention.id) {
        durationHours = Math.max(0.5, durationHours + resizePreview.deltaHours);
      }
      return Math.max(CELL_HEIGHT * 0.5, durationHours * CELL_HEIGHT - 4);
    },
    [resizePreview],
  );

  const handleResizeStart = useCallback(
    (e: React.MouseEvent, intervention: InterventionResponse) => {
      e.preventDefault();
      e.stopPropagation();

      const startY = e.clientY;
      let currentDelta = 0;

      const onMouseMove = (ev: MouseEvent) => {
        ev.preventDefault();
        const dy = ev.clientY - startY;
        currentDelta = Math.round(dy / CELL_HEIGHT);
        setResizePreview({ id: intervention.id, deltaHours: currentDelta });
      };

      const onMouseUp = () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);

        justResizedRef.current = true;
        requestAnimationFrame(() => {
          justResizedRef.current = false;
        });

        if (currentDelta !== 0 && intervention.scheduledStart) {
          const start = new Date(intervention.scheduledStart);
          const originalEnd = intervention.scheduledEnd
            ? new Date(intervention.scheduledEnd)
            : new Date(start.getTime() + 60 * 60 * 1000);
          const newEnd = new Date(
            originalEnd.getTime() + currentDelta * 60 * 60 * 1000,
          );
          if (newEnd.getTime() > start.getTime()) {
            updateMutation.mutate({
              id: intervention.id,
              payload: { scheduledEnd: newEnd.toISOString() },
            });
          }
        }

        setResizePreview(null);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [updateMutation],
  );

  // ── Header text ──

  const today = new Date();

  const headerText = useMemo(() => {
    if (view === "week") {
      const start = weekDays[0];
      const end = weekDays[6];
      if (start.getMonth() === end.getMonth()) {
        return `${start.getDate()} – ${end.getDate()} ${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`;
      }
      return `${start.getDate()} ${MONTH_NAMES[start.getMonth()]} – ${end.getDate()} ${MONTH_NAMES[end.getMonth()]} ${start.getFullYear()}`;
    }
    return `${MONTH_NAMES[referenceDate.getMonth()]} ${referenceDate.getFullYear()}`;
  }, [view, weekDays, referenceDate]);

  // ── Render helpers ──

  const formatDuration = (intervention: InterventionResponse, delta: number): string => {
    let hours = 1;
    if (intervention.scheduledStart && intervention.scheduledEnd) {
      hours =
        (new Date(intervention.scheduledEnd).getTime() -
          new Date(intervention.scheduledStart).getTime()) /
        (60 * 60 * 1000);
    }
    const total = Math.max(0.5, hours + delta);
    if (total === 1) return "1h";
    if (total % 1 === 0) return `${total}h`;
    return `${Math.floor(total)}h${(total % 1) * 60}min`;
  };

  return (
    <div className="space-y-4">
      {/* Title bar */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Calendrier</h1>
          <p className="text-sm text-slate-500 mt-1">
            Planifiez et déplacez vos interventions par glisser-déposer.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button
              onClick={() => setView("week")}
              className={`px-3 py-1.5 text-xs font-medium transition ${
                view === "week"
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Semaine
            </button>
            <button
              onClick={() => setView("month")}
              className={`px-3 py-1.5 text-xs font-medium transition ${
                view === "month"
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Mois
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            &larr;
          </button>
          <button
            onClick={goToday}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
          >
            Aujourd&apos;hui
          </button>
          <button
            onClick={() => navigate(1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            &rarr;
          </button>
        </div>
        <div className="text-sm font-semibold text-slate-700">{headerText}</div>
      </div>

      {/* Main content: calendar + unscheduled panel */}
      <div className="flex gap-4 items-start">
        <div className="flex-1 min-w-0">
          {view === "week" ? (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-auto">
              <div className="grid grid-cols-[60px_repeat(7,1fr)] min-w-[800px]">
                {/* Column headers */}
                <div className="border-b border-r border-slate-200 p-2" />
                {weekDays.map((day, i) => {
                  const isToday = isSameDay(day, today);
                  return (
                    <div
                      key={i}
                      className={`border-b border-r border-slate-200 p-2 text-center text-xs font-medium ${
                        isToday
                          ? "bg-brand-600/5 text-brand-600"
                          : "text-slate-600"
                      }`}
                    >
                      <div>{DAY_NAMES[i]}</div>
                      <div
                        className={`text-lg font-semibold ${
                          isToday ? "text-brand-600" : "text-slate-800"
                        }`}
                      >
                        {day.getDate()}
                      </div>
                    </div>
                  );
                })}

                {/* Hour rows */}
                {HOURS.map((hour) => (
                  <React.Fragment key={hour}>
                    <div
                      className="border-r border-b border-slate-100 p-1 text-[10px] text-slate-400 text-right pr-2"
                      style={{ height: CELL_HEIGHT }}
                    >
                      {hour}:00
                    </div>
                    {weekDays.map((day, dayIdx) => {
                      const dayInterventions = getInterventionsForDay(day).filter(
                        (i) => new Date(i.scheduledStart!).getHours() === hour,
                      );
                      return (
                        <div
                          key={dayIdx}
                          className="border-r border-b border-slate-100 relative overflow-visible"
                          style={{ height: CELL_HEIGHT }}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, day, hour)}
                        >
                          {dayInterventions.map((intervention, idx) => {
                            const cardHeight = getCardHeight(intervention);
                            const isResizing =
                              resizePreview?.id === intervention.id;
                            return (
                              <div
                                key={intervention.id}
                                draggable={!isResizing}
                                onDragStart={(e) =>
                                  handleDragStart(e, intervention)
                                }
                                onClick={() =>
                                  navigateToIntervention(intervention)
                                }
                                className={`absolute rounded px-1.5 py-0.5 text-[10px] select-none overflow-hidden ${
                                  isResizing
                                    ? "ring-2 ring-brand-500 shadow-md z-30 cursor-ns-resize"
                                    : "cursor-grab active:cursor-grabbing z-10 hover:shadow-sm hover:brightness-95"
                                } ${statusClasses(intervention.status)}`}
                                style={{
                                  top: 2 + idx * 2,
                                  left: 2,
                                  right: 2,
                                  height: cardHeight,
                                }}
                                title={`${intervention.title}${intervention.caseTitle ? ` (${intervention.caseTitle})` : ""} — Cliquer pour voir la fiche`}
                              >
                                <span className="leading-tight">
                                  {intervention.title}
                                </span>
                                {cardHeight >= CELL_HEIGHT && intervention.caseTitle && (
                                  <span className="block text-[9px] opacity-70 truncate">
                                    {intervention.caseTitle}
                                  </span>
                                )}
                                {isResizing && resizePreview && (
                                  <span className="absolute bottom-1 right-1 text-[9px] font-semibold opacity-80">
                                    {formatDuration(intervention, resizePreview.deltaHours)}
                                  </span>
                                )}
                                {/* Resize handle */}
                                <div
                                  className="absolute bottom-0 left-0 right-0 h-2.5 cursor-ns-resize group/handle"
                                  onMouseDown={(e) =>
                                    handleResizeStart(e, intervention)
                                  }
                                  draggable={false}
                                  onDragStart={(e) => e.preventDefault()}
                                >
                                  <div className="flex justify-center items-end h-full pb-0.5">
                                    <div className="w-6 h-[3px] rounded-full bg-current opacity-0 group-hover/handle:opacity-40 transition" />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ) : (
            /* Month view */
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="grid grid-cols-7">
                {DAY_NAMES.map((day) => (
                  <div
                    key={day}
                    className="border-b border-slate-200 p-2 text-center text-xs font-medium text-slate-600"
                  >
                    {day}
                  </div>
                ))}
                {monthWeeks.flatMap((week, wi) =>
                  week.map((day, di) => {
                    const dayInterventions = day
                      ? getInterventionsForDay(day)
                      : [];
                    const isToday = day ? isSameDay(day, today) : false;
                    return (
                      <div
                        key={`${wi}-${di}`}
                        className={`border-b border-r border-slate-100 p-1.5 min-h-[80px] ${
                          !day
                            ? "bg-slate-50/50"
                            : isToday
                              ? "bg-brand-600/5"
                              : ""
                        }`}
                        onDragOver={day ? handleDragOver : undefined}
                        onDrop={
                          day ? (e) => handleDrop(e, day) : undefined
                        }
                      >
                        {day && (
                          <>
                            <div
                              className={`text-xs font-medium mb-1 ${
                                isToday
                                  ? "text-brand-600"
                                  : "text-slate-600"
                              }`}
                            >
                              {day.getDate()}
                            </div>
                            <div className="space-y-0.5">
                              {dayInterventions
                                .slice(0, 3)
                                .map((intervention) => (
                                  <div
                                    key={intervention.id}
                                    draggable
                                    onDragStart={(e) =>
                                      handleDragStart(e, intervention)
                                    }
                                    onClick={() =>
                                      navigateToIntervention(intervention)
                                    }
                                    className="flex items-center gap-1 cursor-grab active:cursor-grabbing hover:text-brand-600 transition-colors"
                                    title={`${intervention.title}${intervention.caseTitle ? ` (${intervention.caseTitle})` : ""} — Cliquer pour voir la fiche`}
                                  >
                                    <div
                                      className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[intervention.status] ?? "bg-slate-400"}`}
                                    />
                                    <span className="text-[10px] text-slate-700 truncate hover:text-brand-600">
                                      {intervention.title}
                                    </span>
                                  </div>
                                ))}
                              {dayInterventions.length > 3 && (
                                <div className="text-[10px] text-slate-400">
                                  +{dayInterventions.length - 3} autre
                                  {dayInterventions.length - 3 > 1
                                    ? "s"
                                    : ""}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  }),
                )}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-slate-500 mt-4">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-500" /> Planifiée
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> En cours
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" /> Terminée
            </span>
          </div>
        </div>

        {/* Right panel */}
        <UnscheduledPanel
          onDragStart={handleDragStart}
          onDropToUnschedule={handleDropToUnschedule}
          onClickIntervention={navigateToIntervention}
        />
      </div>
    </div>
  );
}
