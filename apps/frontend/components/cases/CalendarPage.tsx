"use client";

import React, { useCallback, useMemo, useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/cases.api";
import type { InterventionResponse } from "@syncora/shared";

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

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: api.UpdateInterventionPayload }) =>
      api.updateIntervention(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-interventions"] });
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
    dragRef.current = {
      intervention,
      originDate: new Date(intervention.scheduledStart!)
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
          <p className="text-sm text-slate-500 mt-1">
            Planifiez et déplacez vos interventions par glisser-déposer.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button
              onClick={() => setView("week")}
              className={`px-3 py-1.5 text-xs font-medium transition ${
                view === "week" ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              Semaine
            </button>
            <button
              onClick={() => setView("month")}
              className={`px-3 py-1.5 text-xs font-medium transition ${
                view === "month" ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50"
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

      {view === "week" ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-auto">
          <div className="grid grid-cols-[60px_repeat(7,1fr)] min-w-[800px]">
            <div className="border-b border-r border-slate-200 p-2" />
            {weekDays.map((day, i) => {
              const isToday = isSameDay(day, today);
              return (
                <div
                  key={i}
                  className={`border-b border-r border-slate-200 p-2 text-center text-xs font-medium ${
                    isToday ? "bg-brand-600/5 text-brand-600" : "text-slate-600"
                  }`}
                >
                  <div>{DAY_NAMES[i]}</div>
                  <div className={`text-lg font-semibold ${isToday ? "text-brand-600" : "text-slate-800"}`}>
                    {day.getDate()}
                  </div>
                </div>
              );
            })}

            {HOURS.map((hour) => (
              <React.Fragment key={hour}>
                <div className="border-r border-b border-slate-100 p-1 text-[10px] text-slate-400 text-right pr-2">
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
                      className="border-r border-b border-slate-100 p-0.5 min-h-[40px] relative"
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, day, hour)}
                    >
                      {dayInterventions.map((intervention) => (
                        <div
                          key={intervention.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, intervention)}
                          className={`rounded px-1.5 py-0.5 text-[10px] cursor-grab active:cursor-grabbing mb-0.5 truncate ${
                            intervention.status === "completed"
                              ? "bg-green-100 text-green-800 border border-green-200"
                              : intervention.status === "in_progress"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-blue-100 text-blue-800 border border-blue-200"
                          }`}
                          title={`${intervention.title}${intervention.caseTitle ? ` (${intervention.caseTitle})` : ""}`}
                        >
                          {intervention.title}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="grid grid-cols-7">
            {DAY_NAMES.map((day) => (
              <div key={day} className="border-b border-slate-200 p-2 text-center text-xs font-medium text-slate-600">
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
                    className={`border-b border-r border-slate-100 p-1.5 min-h-[80px] ${
                      !day ? "bg-slate-50/50" : isToday ? "bg-brand-600/5" : ""
                    }`}
                    onDragOver={day ? handleDragOver : undefined}
                    onDrop={day ? (e) => handleDrop(e, day) : undefined}
                  >
                    {day && (
                      <>
                        <div className={`text-xs font-medium mb-1 ${isToday ? "text-brand-600" : "text-slate-600"}`}>
                          {day.getDate()}
                        </div>
                        <div className="space-y-0.5">
                          {dayInterventions.slice(0, 3).map((intervention) => (
                            <div
                              key={intervention.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, intervention)}
                              className="flex items-center gap-1 cursor-grab active:cursor-grabbing"
                              title={`${intervention.title}${intervention.caseTitle ? ` (${intervention.caseTitle})` : ""}`}
                            >
                              <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[intervention.status] ?? "bg-slate-400"}`} />
                              <span className="text-[10px] text-slate-700 truncate">
                                {intervention.title}
                              </span>
                            </div>
                          ))}
                          {dayInterventions.length > 3 && (
                            <div className="text-[10px] text-slate-400">
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

      <div className="flex items-center gap-4 text-xs text-slate-500">
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
  );
}
