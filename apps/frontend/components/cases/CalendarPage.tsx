"use client";

import Link from "next/link";
import React, { useCallback, useMemo, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/cases.api";
import * as fleetApi from "@/lib/fleet.api";
import {
  getTeamCalendarCardAppearance,
  getTeamCalendarCardClasses,
  normalizeCalendarColorHex,
  teamLegendSwatchStyle
} from "@/lib/team-calendar-colors";
import type { InterventionResponse, TeamResponse } from "@syncora/shared";

type ViewMode = "week" | "month";

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);

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
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const STATUS_DOT: Record<string, string> = {
  planned: "bg-blue-500",
  in_progress: "bg-amber-500",
  completed: "bg-green-500",
  cancelled: "bg-red-400"
};

const STATUS_LABEL: Record<string, string> = {
  planned: "Planifiée",
  in_progress: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
};

/** Libellé dans le panneau sans créneau : éviter « Planifiée » (statut métier planned ≠ calendrier). */
function unscheduledPanelStatusLabel(status: string): string {
  if (status === "planned") return "À planifier";
  return STATUS_LABEL[status] ?? status;
}

function unscheduledPanelStatusStyle(status: string): string {
  if (status === "planned") {
    return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700";
  }
  if (status === "in_progress") {
    return "bg-amber-50 text-amber-700";
  }
  if (status === "completed") {
    return "bg-green-50 text-green-700";
  }
  if (status === "cancelled") {
    return "bg-red-50 text-red-700";
  }
  return "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300";
}

function unscheduledPanelStatusDot(status: string): string {
  if (status === "planned") return "bg-slate-400";
  return STATUS_DOT[status] ?? "bg-slate-400";
}

// ────────────────────────────────────────────────────────────────────────────
// Unscheduled Panel
// ────────────────────────────────────────────────────────────────────────────

function UnscheduledPanel({
  onDragStart,
  onDropToUnschedule,
  teamsById
}: {
  onDragStart: (e: React.DragEvent, intervention: InterventionResponse) => void;
  onDropToUnschedule: (interventionId: string) => void;
  teamsById: Map<string, TeamResponse>;
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
            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center justify-center w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm dark:shadow-slate-950/20 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          title="Afficher les interventions non planifiées"
        >
          <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        {dropHover && (
          <span className="text-[10px] text-brand-600 dark:text-brand-400 font-medium whitespace-nowrap">Déplanifier</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex-shrink-0 w-72 xl:w-80 rounded-xl border-2 shadow-sm dark:shadow-slate-950/20 flex flex-col max-h-[calc(100vh-220px)] transition-colors ${
        dropHover
          ? "border-brand-600 bg-brand-50/30"
          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-brand-600/10">
            <svg className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200">Non planifiées</h3>
          {unscheduledInterventions && (
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-full px-1.5 py-0.5">
              {unscheduledInterventions.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 rounded hover:bg-slate-100 dark:bg-slate-800 transition"
          title="Réduire le panneau"
        >
          <svg className="w-4 h-4 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
        <div className="relative">
          <svg
            className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600"
          />
        </div>
      </div>

      {/* Drop overlay feedback */}
      {dropHover && (
        <div className="px-3 py-3 flex items-center justify-center gap-2 border-b border-brand-200 bg-brand-50">
          <svg className="w-4 h-4 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
          </svg>
          <span className="text-xs font-medium text-brand-600 dark:text-brand-400">
            Déposez ici pour déplanifier
          </span>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-slate-200 dark:border-slate-700 border-t-brand-600 rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && filtered.length === 0 && !dropHover && (
          <div className="text-center py-8">
            <svg className="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {searchTerm ? "Aucun résultat" : "Toutes les interventions sont planifiées"}
            </p>
          </div>
        )}

        {filtered.map((intervention) => {
          const appearance = getTeamCalendarCardAppearance(
            intervention.assignedTeamId,
            intervention.assignedTeamId ? teamsById.get(intervention.assignedTeamId)?.calendarColor : undefined
          );
          return (
          <Link
            key={intervention.id}
            href={`/cases/${intervention.caseId}`}
            draggable
            onDragStart={(e) => onDragStart(e, intervention)}
            title={`Ouvrir le dossier${intervention.caseTitle ? ` « ${intervention.caseTitle} »` : ""}`}
            className={`group block rounded-lg p-2.5 cursor-grab active:cursor-grabbing hover:shadow-md transition-all no-underline text-left ${appearance.className}`}
            style={appearance.style}
          >
            <div className="flex items-start gap-2">
              <div className="mt-1 flex-shrink-0 opacity-70">
                <svg className="w-3.5 h-3.5 transition group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate text-inherit">{intervention.title}</p>
                {intervention.caseTitle && (
                  <p className="text-[10px] truncate mt-0.5 opacity-85">{intervention.caseTitle}</p>
                )}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${unscheduledPanelStatusStyle(intervention.status)}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${unscheduledPanelStatusDot(intervention.status)}`}
                    />
                    {unscheduledPanelStatusLabel(intervention.status)}
                  </span>
                  {(intervention.assigneeName || intervention.assignedTeamName) && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                      {intervention.assigneeName ??
                        (intervention.assignedTeamName ? `Équipe : ${intervention.assignedTeamName}` : "")}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800">
        <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
          Clic pour ouvrir le dossier · glissez depuis/vers le calendrier pour planifier/déplanifier
        </p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Calendar Page
// ────────────────────────────────────────────────────────────────────────────

export function CalendarPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<ViewMode>("week");
  const [referenceDate, setReferenceDate] = useState(new Date());
  const dragRef = useRef<{ intervention: InterventionResponse; originDate: Date } | null>(null);

  const weekDays = useMemo(() => getWeekDays(referenceDate), [referenceDate]);
  const monthWeeks = useMemo(
    () => getMonthDays(referenceDate.getFullYear(), referenceDate.getMonth()),
    [referenceDate]
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
    return new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0, 23, 59, 59, 999);
  }, [view, weekDays, referenceDate]);

  const { data: interventions } = useQuery({
    queryKey: ["calendar-interventions", rangeStart.toISOString(), rangeEnd.toISOString()],
    queryFn: () =>
      api.listInterventions({
        startDate: rangeStart.toISOString(),
        endDate: rangeEnd.toISOString()
      })
  });

  const { data: teams } = useQuery({
    queryKey: ["fleet-teams"],
    queryFn: () => fleetApi.listTeams()
  });

  const teamsById = useMemo(
    () => new Map((teams ?? []).map((t) => [t.id, t])),
    [teams]
  );

  const teamsSorted = useMemo(
    () => [...(teams ?? [])].sort((a, b) => a.name.localeCompare(b.name, "fr")),
    [teams]
  );

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: api.UpdateInterventionPayload }) =>
      api.updateIntervention(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-interventions"] });
      queryClient.invalidateQueries({ queryKey: ["unscheduled-interventions"] });
    }
  });

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
    [interventions]
  );

  const handleDragStart = (e: React.DragEvent, intervention: InterventionResponse) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", intervention.id);
    const fallback = new Date();
    fallback.setHours(9, 0, 0, 0);
    dragRef.current = {
      intervention,
      originDate: intervention.scheduledStart ? new Date(intervention.scheduledStart) : fallback
    };
  };

  const handleDrop = (e: React.DragEvent, targetDate: Date, targetHour?: number) => {
    e.preventDefault();
    if (!dragRef.current) return;
    const { intervention, originDate } = dragRef.current;

    const newStart = new Date(targetDate);
    if (targetHour !== undefined) {
      newStart.setHours(targetHour, 0, 0, 0);
    } else {
      newStart.setHours(originDate.getHours(), originDate.getMinutes(), 0, 0);
    }

    let newEnd: string | undefined;
    if (intervention.scheduledStart && intervention.scheduledEnd) {
      const duration = new Date(intervention.scheduledEnd).getTime() - new Date(intervention.scheduledStart).getTime();
      newEnd = new Date(newStart.getTime() + duration).toISOString();
    } else {
      newEnd = new Date(newStart.getTime() + 60 * 60 * 1000).toISOString();
    }

    updateMutation.mutate({
      id: intervention.id,
      payload: {
        scheduledStart: newStart.toISOString(),
        scheduledEnd: newEnd
      }
    });

    dragRef.current = null;
  };

  const handleDropToUnschedule = (interventionId: string) => {
    updateMutation.mutate({
      id: interventionId,
      payload: { scheduledStart: null, scheduledEnd: null }
    });
    dragRef.current = null;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Calendrier</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Couleur de carte = équipe assignée à l&apos;intervention. Cliquez pour ouvrir le dossier, glissez-déposez pour
            planifier.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              onClick={() => setView("week")}
              className={`px-3 py-1.5 text-xs font-medium transition ${
                view === "week" ? "bg-brand-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              Semaine
            </button>
            <button
              onClick={() => setView("month")}
              className={`px-3 py-1.5 text-xs font-medium transition ${
                view === "month" ? "bg-brand-600 text-white" : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              Mois
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            &larr;
          </button>
          <button
            onClick={goToday}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Aujourd&apos;hui
          </button>
          <button
            onClick={() => navigate(1)}
            className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            &rarr;
          </button>
        </div>
        <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{headerText}</div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-start">
        <div className="flex-1 min-w-0 w-full space-y-4">
      {view === "week" ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm dark:shadow-slate-950/20 overflow-auto">
          <div className="grid grid-cols-[60px_repeat(7,1fr)] min-w-[800px]">
            <div className="border-b border-r border-slate-200 dark:border-slate-700 p-2" />
            {weekDays.map((day, i) => {
              const isToday = isSameDay(day, today);
              return (
                <div
                  key={i}
                  className={`border-b border-r border-slate-200 dark:border-slate-700 p-2 text-center text-xs font-medium ${
                    isToday ? "bg-brand-600/5 text-brand-600 dark:text-brand-400" : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <div>{DAY_NAMES[i]}</div>
                  <div className={`text-lg font-semibold ${isToday ? "text-brand-600 dark:text-brand-400" : "text-slate-800 dark:text-slate-100"}`}>
                    {day.getDate()}
                  </div>
                </div>
              );
            })}

            {HOURS.map((hour) => (
              <React.Fragment key={hour}>
                <div className="border-r border-b border-slate-100 dark:border-slate-800 p-1 text-[10px] text-slate-400 dark:text-slate-500 text-right pr-2">
                  {hour}:00
                </div>
                {weekDays.map((day, dayIdx) => {
                  const dayInterventions = getInterventionsForDay(day).filter((i) => {
                    const h = new Date(i.scheduledStart!).getHours();
                    return h === hour;
                  });
                  return (
                    <div
                      key={dayIdx}
                      className="border-r border-b border-slate-100 dark:border-slate-800 p-0.5 min-h-[40px] relative"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, day, hour)}
                    >
                      {dayInterventions.map((intervention) => {
                        const appearance = getTeamCalendarCardAppearance(
                          intervention.assignedTeamId,
                          intervention.assignedTeamId
                            ? teamsById.get(intervention.assignedTeamId)?.calendarColor
                            : undefined
                        );
                        return (
                        <Link
                          key={intervention.id}
                          href={`/cases/${intervention.caseId}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, intervention)}
                          className={`block rounded px-1.5 py-0.5 text-[10px] cursor-grab active:cursor-grabbing mb-0.5 no-underline ${appearance.className}`}
                          style={appearance.style}
                          title={`Ouvrir le dossier — ${intervention.title}${intervention.caseTitle ? ` (${intervention.caseTitle})` : ""}${intervention.assignedTeamName ? ` · ${intervention.assignedTeamName}` : ""}`}
                        >
                          <span className="flex items-center gap-1 min-w-0">
                            <span
                              className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ring-1 ring-white/50 dark:ring-black/20 ${STATUS_DOT[intervention.status] ?? "bg-slate-400"}`}
                              aria-hidden
                            />
                            <span className="truncate text-inherit">{intervention.title}</span>
                          </span>
                        </Link>
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
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm dark:shadow-slate-950/20 overflow-hidden">
          <div className="grid grid-cols-7">
            {DAY_NAMES.map((day) => (
              <div key={day} className="border-b border-slate-200 dark:border-slate-700 p-2 text-center text-xs font-medium text-slate-600 dark:text-slate-300">
                {day}
              </div>
            ))}
            {monthWeeks.flatMap((week, wi) =>
              week.map((day, di) => {
                const dayInterventions = day ? getInterventionsForDay(day) : [];
                const isToday = day ? isSameDay(day, today) : false;
                return (
                  <div
                    key={`${wi}-${di}`}
                    className={`border-b border-r border-slate-100 dark:border-slate-800 p-1.5 min-h-[80px] ${
                      !day ? "bg-slate-50 dark:bg-slate-950/50" : isToday ? "bg-brand-600/5" : ""
                    }`}
                    onDragOver={day ? handleDragOver : undefined}
                    onDrop={day ? (e) => handleDrop(e, day) : undefined}
                  >
                    {day && (
                      <>
                        <div className={`text-xs font-medium mb-1 ${isToday ? "text-brand-600 dark:text-brand-400" : "text-slate-600 dark:text-slate-300"}`}>
                          {day.getDate()}
                        </div>
                        <div className="space-y-0.5">
                          {dayInterventions.slice(0, 3).map((intervention) => {
                            const appearance = getTeamCalendarCardAppearance(
                              intervention.assignedTeamId,
                              intervention.assignedTeamId
                                ? teamsById.get(intervention.assignedTeamId)?.calendarColor
                                : undefined
                            );
                            return (
                            <Link
                              key={intervention.id}
                              href={`/cases/${intervention.caseId}`}
                              draggable
                              onDragStart={(e) => handleDragStart(e, intervention)}
                              className={`flex items-center gap-1 cursor-grab active:cursor-grabbing rounded px-0.5 py-0.5 -mx-0.5 no-underline min-w-0 ${appearance.className}`}
                              style={appearance.style}
                              title={`Ouvrir le dossier — ${intervention.title}${intervention.caseTitle ? ` (${intervention.caseTitle})` : ""}${intervention.assignedTeamName ? ` · ${intervention.assignedTeamName}` : ""}`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ring-1 ring-white/50 dark:ring-black/20 ${STATUS_DOT[intervention.status] ?? "bg-slate-400"}`}
                                aria-hidden
                              />
                              <span className="text-[10px] truncate text-inherit">{intervention.title}</span>
                            </Link>
                            );
                          })}
                          {dayInterventions.length > 3 && (
                            <div className="text-[10px] text-slate-400 dark:text-slate-500">
                              +{dayInterventions.length - 3} autre{dayInterventions.length - 3 > 1 ? "s" : ""}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 text-xs text-slate-500 dark:text-slate-400">
        <p>
          <span className="font-medium text-slate-600 dark:text-slate-300">Couleur des cartes</span> — selon
          l&apos;équipe assignée à l&apos;intervention. Sans équipe : gris. Couleur personnalisable sur la fiche de chaque
          équipe (Flotte).
        </p>

        {teamsSorted.length > 0 && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
              Légende équipes
            </p>
            <ul className="flex flex-wrap gap-x-4 gap-y-2">
              {teamsSorted.map((t) => (
                <li key={t.id} className="flex items-center gap-2 min-w-0 max-w-[220px]">
                  {t.calendarColor && normalizeCalendarColorHex(t.calendarColor) ? (
                    <span
                      className="team-cal-legend-swatch h-3.5 w-3.5 rounded shrink-0"
                      style={teamLegendSwatchStyle(t.calendarColor)}
                      aria-hidden
                    />
                  ) : (
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded shrink-0 ${getTeamCalendarCardClasses(t.id)}`}
                      aria-hidden
                    />
                  )}
                  <span className="truncate text-slate-700 dark:text-slate-200" title={t.name}>
                    {t.name}
                  </span>
                  {!t.calendarColor && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">(auto)</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-medium text-slate-600 dark:text-slate-300 mr-1">Statut (point)</span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-blue-500" /> Planifiée
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> En cours
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-green-500" /> Terminée
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-400" /> Annulée
          </span>
        </div>
      </div>
        </div>
        <UnscheduledPanel
          onDragStart={handleDragStart}
          onDropToUnschedule={handleDropToUnschedule}
          teamsById={teamsById}
        />
      </div>
    </div>
  );
}
