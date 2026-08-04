"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useIsDarkMode } from "@/lib/use-is-dark-mode";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/cases.api";
import * as fleetApi from "@/lib/fleet.api";
import * as exportsApi from "@/lib/exports.api";
import { listOrganizationUsers } from "@/lib/admin.api";
import {
  getTeamCalendarCardAppearance,
  getTeamCalendarCardClasses,
  normalizeCalendarColorHex,
  teamLegendSwatchStyle,
} from "@/lib/team-calendar-colors";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { ExportButton } from "@/components/ui/ExportButton";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/components/auth/AuthContext";
import { hasPermission } from "@/lib/auth-permissions";
import type { InterventionResponse, TeamResponse, TechnicianResponse } from "@planwise/shared";
import { MAX_PAGE_LIMIT_WIDE } from "@planwise/shared";

type ViewMode = "day" | "week" | "month";

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DAY_NAMES_FULL = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

function isInterventionScheduleLocked(intervention: Pick<InterventionResponse, "status">): boolean {
  return intervention.status === "completed";
}

function looksLikeObjectId(value: string): boolean {
  return /^[a-f0-9]{24}$/i.test(value.trim());
}

/** Prefers a human label; ignores empty values and raw Mongo ids. */
function pickPersonDisplayLabel(...candidates: Array<string | undefined | null>): string | null {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed && !looksLikeObjectId(trimmed)) return trimmed;
  }
  return null;
}

function isInterventionUnassigned(
  intervention: Pick<InterventionResponse, "assignedTeamId" | "assigneeId">,
): boolean {
  return !intervention.assignedTeamId?.trim() && !intervention.assigneeId?.trim();
}

function resolveInterventionCardAppearance(
  intervention: InterventionResponse,
  teamsById: Map<string, TeamResponse>,
  techniciansByAssigneeId: Map<string, TechnicianResponse>,
  isDark: boolean,
) {
  const teamId = intervention.assignedTeamId;
  if (teamId) {
    return getTeamCalendarCardAppearance(teamId, teamsById.get(teamId)?.calendarColor, isDark);
  }
  const assigneeId = intervention.assigneeId;
  const technician = assigneeId ? techniciansByAssigneeId.get(assigneeId) : undefined;
  return getTeamCalendarCardAppearance(undefined, undefined, isDark, {
    assigneeId,
    assigneeCalendarColor: technician?.calendarColor,
  });
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7h → 20h
const HOUR_HEIGHT_PX = 48;
const WEEK_GRID_START_HOUR = HOURS[0]!;
const WEEK_GRID_END_HOUR = HOURS[HOURS.length - 1]! + 1; // exclusive
const RESIZE_SNAP_MINUTES = 15;
const MIN_INTERVENTION_DURATION_MIN = 15;

function formatClock(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function snapMinutes(totalMinutes: number, step = RESIZE_SNAP_MINUTES): number {
  return Math.round(totalMinutes / step) * step;
}

/** Convertit une position Y dans la colonne jour en Date (fin d’intervention). */
function pointerYToEndDate(day: Date, clientY: number, dayColumnEl: HTMLElement): Date {
  const rect = dayColumnEl.getBoundingClientRect();
  const y = Math.min(Math.max(clientY - rect.top, 0), rect.height);
  const minutesFromGridStart = snapMinutes((y / HOUR_HEIGHT_PX) * 60);
  const totalMin = WEEK_GRID_START_HOUR * 60 + minutesFromGridStart;
  const maxMin = WEEK_GRID_END_HOUR * 60;
  const clamped = Math.min(Math.max(totalMin, WEEK_GRID_START_HOUR * 60), maxMin);
  const end = new Date(day);
  end.setHours(0, 0, 0, 0);
  end.setMinutes(clamped);
  return end;
}

function clampEndAfterStart(start: Date, end: Date): Date {
  const minEnd = new Date(start.getTime() + MIN_INTERVENTION_DURATION_MIN * 60_000);
  const gridEnd = new Date(start);
  gridEnd.setHours(WEEK_GRID_END_HOUR, 0, 0, 0);
  let result = end < minEnd ? minEnd : end;
  if (result > gridEnd) result = gridEnd;
  if (result <= start) result = minEnd;
  return result;
}

/** Position verticale d’une intervention dans la grille horaire (vue semaine). */
function getWeekEventVerticalLayout(
  intervention: InterventionResponse,
  day: Date,
): { top: number; height: number; start: Date; end: Date } | null {
  if (!intervention.scheduledStart) return null;
  const start = new Date(intervention.scheduledStart);
  if (!isSameDay(start, day)) return null;

  const end = intervention.scheduledEnd
    ? new Date(intervention.scheduledEnd)
    : new Date(start.getTime() + 60 * 60 * 1000);

  const gridStartMin = WEEK_GRID_START_HOUR * 60;
  const gridEndMin = WEEK_GRID_END_HOUR * 60;
  const startMin = start.getHours() * 60 + start.getMinutes();
  const rawEndMin = end.getHours() * 60 + end.getMinutes() + end.getSeconds() / 60;
  // Fin un autre jour → étendre jusqu’à la fin de la grille du jour ; sinon au moins 15 min
  const endMin = !isSameDay(end, day)
    ? gridEndMin
    : rawEndMin <= startMin
      ? startMin + 60
      : rawEndMin;

  const clampedStart = Math.min(Math.max(startMin, gridStartMin), gridEndMin - 15);
  const clampedEnd = Math.min(Math.max(endMin, clampedStart + 15), gridEndMin);

  const top = ((clampedStart - gridStartMin) / 60) * HOUR_HEIGHT_PX;
  const height = Math.max(((clampedEnd - clampedStart) / 60) * HOUR_HEIGHT_PX, 22);
  return { top, height, start, end };
}

type WeekEventLane = {
  intervention: InterventionResponse;
  top: number;
  height: number;
  start: Date;
  end: Date;
  lane: number;
  laneCount: number;
};

/** Répartit les chevauchements sur des colonnes (lanes) dans une journée. */
function layoutWeekDayEvents(interventions: InterventionResponse[], day: Date): WeekEventLane[] {
  const positioned = interventions
    .map((intervention) => {
      const layout = getWeekEventVerticalLayout(intervention, day);
      if (!layout) return null;
      return { intervention, ...layout };
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
    .sort((a, b) => a.start.getTime() - b.start.getTime() || b.height - a.height);

  const laneEnds: number[] = [];
  const withLane: Array<(typeof positioned)[number] & { lane: number }> = [];

  for (const event of positioned) {
    const startMs = event.start.getTime();
    let lane = laneEnds.findIndex((endMs) => endMs <= startMs);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(event.end.getTime());
    } else {
      laneEnds[lane] = event.end.getTime();
    }
    withLane.push({ ...event, lane });
  }

  // Pour chaque cluster de chevauchement, laneCount = max lanes utilisées
  return withLane.map((event) => {
    const overlapping = withLane.filter(
      (other) =>
        other.start.getTime() < event.end.getTime() && other.end.getTime() > event.start.getTime(),
    );
    const laneCount = Math.max(...overlapping.map((o) => o.lane), event.lane) + 1;
    return { ...event, laneCount };
  });
}

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

/** Index Lundi=0 … Dimanche=6 */
function mondayBasedDow(date: Date): number {
  const dow = date.getDay();
  return dow === 0 ? 6 : dow - 1;
}

function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

const MONTH_NAMES = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
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
    return "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-100 border border-amber-200 dark:border-amber-800";
  }
  if (status === "completed") {
    return "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-100 border border-green-200 dark:border-green-800";
  }
  if (status === "cancelled") {
    return "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-100 border border-red-200 dark:border-red-800";
  }
  return "bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300";
}

function unscheduledPanelStatusDot(status: string): string {
  if (status === "planned") return "bg-slate-400";
  return STATUS_DOT[status] ?? "bg-slate-400";
}

// ────────────────────────────────────────────────────────────────────────────
// Assignation rapide (équipe / technicien)
// ────────────────────────────────────────────────────────────────────────────

const QUICK_ASSIGN_MENU_MAX_H = 224; // ~max-h-56
const QUICK_ASSIGN_MENU_MIN_W = 224;

type QuickAssignMenuPos = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  openUp: boolean;
};

function QuickAssignControl({
  intervention,
  teams,
  technicians,
  onAssign,
  busy,
  compact = false,
}: {
  intervention: InterventionResponse;
  teams: TeamResponse[];
  technicians: TechnicianResponse[];
  onAssign: (payload: api.UpdateInterventionPayload) => void;
  busy?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<QuickAssignMenuPos | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const unassigned = isInterventionUnassigned(intervention);
  const activeTeams = useMemo(
    () =>
      [...teams]
        .filter((t) => t.status === "active")
        .sort((a, b) => a.name.localeCompare(b.name, "fr")),
    [teams],
  );
  const activeTechnicians = useMemo(
    () =>
      [...technicians]
        .filter((t) => t.status === "actif")
        .sort((a, b) =>
          `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "fr"),
        ),
    [technicians],
  );

  const updateMenuPosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const gap = 4;
    const spaceBelow = window.innerHeight - rect.bottom - gap - 8;
    const spaceAbove = rect.top - gap - 8;
    const openUp = spaceBelow < Math.min(QUICK_ASSIGN_MENU_MAX_H, 160) && spaceAbove > spaceBelow;
    const maxHeight = Math.min(
      QUICK_ASSIGN_MENU_MAX_H,
      Math.max(120, openUp ? spaceAbove : spaceBelow),
    );
    const width = Math.min(
      window.innerWidth - 16,
      Math.max(compact ? QUICK_ASSIGN_MENU_MIN_W : rect.width, QUICK_ASSIGN_MENU_MIN_W),
    );
    let left = compact ? rect.right - width : rect.left;
    left = Math.min(Math.max(8, left), window.innerWidth - width - 8);
    const top = openUp ? rect.top - gap : rect.bottom + gap;
    setMenuPos({ top, left, width, maxHeight, openUp });
  }, [compact]);

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    updateMenuPosition();
    const onReposition = () => updateMenuPosition();
    window.addEventListener("resize", onReposition);
    // capture : scroll dans le panneau / calendrier
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const currentLabel =
    intervention.assignedTeamName?.trim() ||
    intervention.assigneeName?.trim() ||
    (unassigned ? null : "Assigné");

  const menu =
    open && menuPos && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            className="fixed z-[200] overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 shadow-xl"
            style={{
              top: menuPos.openUp ? undefined : menuPos.top,
              bottom: menuPos.openUp ? window.innerHeight - menuPos.top : undefined,
              left: menuPos.left,
              width: menuPos.width,
              maxHeight: menuPos.maxHeight,
            }}
            role="listbox"
            aria-label="Choisir une assignation"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {activeTeams.length > 0 && (
              <div className="px-2 pt-2 pb-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 px-1 mb-1">
                  Équipes
                </p>
                {activeTeams.map((team) => {
                  const selected = intervention.assignedTeamId === team.id;
                  return (
                    <button
                      key={team.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition ${
                        selected
                          ? "bg-brand-50 dark:bg-brand-950/40 text-brand-800 dark:text-brand-200"
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                      onClick={() => {
                        onAssign({
                          assignedTeamId: team.id,
                          assignedTeamName: team.name,
                          assigneeId: null,
                          assigneeName: null,
                        });
                        setOpen(false);
                      }}
                    >
                      <span
                        className={`h-2.5 w-2.5 rounded shrink-0 ${getTeamCalendarCardClasses(team.id, false)}`}
                        aria-hidden
                      />
                      <span className="truncate flex-1">{team.name}</span>
                      {selected && <span className="text-[10px] text-brand-600">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {activeTechnicians.length > 0 && (
              <div className="px-2 pt-1 pb-2 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 px-1 mb-1 mt-1">
                  Techniciens
                </p>
                {activeTechnicians.map((tech) => {
                  const label = `${tech.firstName} ${tech.lastName}`.trim();
                  const selected =
                    intervention.assigneeId === tech.id ||
                    (Boolean(tech.userId) && intervention.assigneeId === tech.userId);
                  return (
                    <button
                      key={tech.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition ${
                        selected
                          ? "bg-brand-50 dark:bg-brand-950/40 text-brand-800 dark:text-brand-200"
                          : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                      onClick={() => {
                        onAssign({
                          assigneeId: tech.userId || tech.id,
                          assigneeName: label,
                          assignedTeamId: null,
                          assignedTeamName: null,
                        });
                        setOpen(false);
                      }}
                    >
                      <span className="truncate flex-1">{label}</span>
                      {selected && <span className="text-[10px] text-brand-600">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {activeTeams.length === 0 && activeTechnicians.length === 0 && (
              <p className="px-3 py-3 text-xs text-slate-500">Aucune équipe ni technicien actif.</p>
            )}

            {!unassigned && (
              <div className="border-t border-slate-100 dark:border-slate-800 p-1.5">
                <button
                  type="button"
                  className="w-full rounded-md px-2 py-1.5 text-left text-xs text-amber-800 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                  onClick={() => {
                    onAssign({
                      assigneeId: null,
                      assigneeName: null,
                      assignedTeamId: null,
                      assignedTeamName: null,
                    });
                    setOpen(false);
                  }}
                >
                  Retirer l&apos;assignation
                </button>
              </div>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={compact ? "" : "w-full"}>
      <button
        ref={buttonRef}
        type="button"
        disabled={busy}
        draggable={false}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onDragStart={(e) => e.preventDefault()}
        className={
          compact
            ? `inline-flex max-w-full items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-semibold leading-tight transition hover:brightness-95 disabled:opacity-50 ${
                unassigned
                  ? "bg-amber-500/90 text-white shadow-sm"
                  : "bg-black/10 dark:bg-white/15 text-inherit"
              }`
            : `inline-flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-semibold transition disabled:opacity-50 ${
                unassigned
                  ? "bg-amber-500 text-white hover:bg-amber-600 shadow-sm"
                  : "bg-white/70 dark:bg-slate-950/40 text-inherit border border-current/20 hover:bg-white dark:hover:bg-slate-900"
              }`
        }
        title="Assigner une équipe ou un technicien"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <svg
          className={compact ? "h-2.5 w-2.5 shrink-0" : "h-3.5 w-3.5 shrink-0"}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
          />
        </svg>
        <span className="truncate">{unassigned ? "Assigner" : (currentLabel ?? "Assigné")}</span>
      </button>
      {menu}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Unscheduled Panel
// ────────────────────────────────────────────────────────────────────────────

function UnscheduledPanel({
  onDragStart,
  onDropToUnschedule,
  teamsById,
  techniciansByAssigneeId,
  teams,
  technicians,
  onAssign,
  canAssign,
  assignBusyId,
  isDark,
  calendarHeight,
}: {
  onDragStart: (e: React.DragEvent, intervention: InterventionResponse) => void;
  onDropToUnschedule: (interventionId: string) => void;
  teamsById: Map<string, TeamResponse>;
  techniciansByAssigneeId: Map<string, TechnicianResponse>;
  teams: TeamResponse[];
  technicians: TechnicianResponse[];
  onAssign: (interventionId: string, payload: api.UpdateInterventionPayload) => void;
  canAssign: boolean;
  assignBusyId?: string | null;
  isDark: boolean;
  /** Hauteur du bloc calendrier (desktop) pour aligner le panneau et activer le scroll. */
  calendarHeight?: number;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [dropHover, setDropHover] = useState(false);
  const dragCounterRef = useRef(0);

  const { data: unscheduledData, isLoading } = useQuery({
    queryKey: ["unscheduled-interventions"],
    queryFn: () => api.listInterventions({ unscheduled: "true", limit: MAX_PAGE_LIMIT_WIDE }),
  });
  const unscheduledInterventions = unscheduledData?.interventions;

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
        className={`flex-shrink-0 self-stretch flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-2 transition-colors ${
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
          <svg
            className="w-5 h-5 text-slate-500 dark:text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
        {dropHover && (
          <span className="text-[10px] text-brand-600 dark:text-brand-400 font-medium whitespace-nowrap">
            Déplanifier
          </span>
        )}
      </div>
    );
  }

  const panelStyle =
    calendarHeight != null
      ? ({ ["--calendar-sync-h" as string]: `${calendarHeight}px` } as React.CSSProperties)
      : undefined;

  return (
    <div
      className={`flex-shrink-0 w-72 xl:w-80 min-h-0 rounded-xl border-2 shadow-sm dark:shadow-slate-950/20 flex flex-col overflow-hidden transition-colors max-lg:max-h-[min(50vh,28rem)] ${
        calendarHeight != null
          ? "lg:h-[var(--calendar-sync-h)] lg:max-h-[var(--calendar-sync-h)]"
          : ""
      } ${
        dropHover
          ? "border-brand-600 bg-brand-50/30"
          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
      }`}
      style={panelStyle}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 py-2.5 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-brand-600/10">
            <svg
              className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            Non planifiées
          </h3>
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
          <svg
            className="w-4 h-4 text-slate-400 dark:text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="flex-shrink-0 px-3 py-2 border-b border-slate-100 dark:border-slate-800">
        <div className="relative">
          <svg
            className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
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
          <svg
            className="w-4 h-4 text-brand-600 dark:text-brand-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3"
            />
          </svg>
          <span className="text-xs font-medium text-brand-600 dark:text-brand-400">
            Déposez ici pour déplanifier
          </span>
        </div>
      )}

      {/* List */}
      <div className="scrollbar-visible flex-1 min-h-0 overflow-y-scroll overscroll-contain p-2 pr-1 space-y-1.5">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-slate-200 dark:border-slate-700 border-t-brand-600 rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && filtered.length === 0 && !dropHover && (
          <div className="text-center py-8">
            <svg
              className="w-8 h-8 text-slate-300 mx-auto mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {searchTerm ? "Aucun résultat" : "Toutes les interventions sont planifiées"}
            </p>
          </div>
        )}

        {filtered.map((intervention) => {
          const appearance = resolveInterventionCardAppearance(
            intervention,
            teamsById,
            techniciansByAssigneeId,
            isDark,
          );
          const scheduleLocked = isInterventionScheduleLocked(intervention);
          const unassigned = isInterventionUnassigned(intervention);
          return (
            <div
              key={intervention.id}
              className={`group rounded-lg transition-all text-left text-inherit ${
                scheduleLocked ? "" : "hover:shadow-md"
              } ${appearance.className}`}
              style={appearance.style}
            >
              <Link
                href={`/cases/${intervention.caseId}`}
                draggable={!scheduleLocked}
                onDragStart={(e) => {
                  if (scheduleLocked) {
                    e.preventDefault();
                    return;
                  }
                  onDragStart(e, intervention);
                }}
                title={
                  scheduleLocked
                    ? `Intervention terminée — dates non modifiables${intervention.caseTitle ? ` · ${intervention.caseTitle}` : ""}`
                    : `Ouvrir le dossier${intervention.caseTitle ? ` « ${intervention.caseTitle} »` : ""}`
                }
                className={`block p-2.5 no-underline text-inherit ${
                  scheduleLocked ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-1 flex-shrink-0 opacity-70">
                    <svg
                      className="w-3.5 h-3.5 transition group-hover:opacity-100"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 9h16.5m-16.5 6.75h16.5"
                      />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate text-inherit">
                      {intervention.title}
                    </p>
                    {intervention.caseTitle && (
                      <p className="text-[10px] truncate mt-0.5 opacity-85">
                        {intervention.caseTitle}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${unscheduledPanelStatusStyle(intervention.status)}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${unscheduledPanelStatusDot(intervention.status)}`}
                        />
                        {unscheduledPanelStatusLabel(intervention.status)}
                      </span>
                      {unassigned ? (
                        <span className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-900 dark:text-amber-100 border border-amber-500/40">
                          Sans assignation
                        </span>
                      ) : (
                        (intervention.assigneeName || intervention.assignedTeamName) && (
                          <span className="text-[10px] truncate text-inherit opacity-85">
                            {intervention.assigneeName ??
                              (intervention.assignedTeamName
                                ? `Équipe : ${intervention.assignedTeamName}`
                                : "")}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </Link>
              {canAssign && !scheduleLocked && (
                <div className="px-2.5 pb-2.5 -mt-1">
                  <QuickAssignControl
                    intervention={intervention}
                    teams={teams}
                    technicians={technicians}
                    busy={assignBusyId === intervention.id}
                    onAssign={(payload) => onAssign(intervention.id, payload)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-3 py-2 border-t border-slate-100 dark:border-slate-800">
        <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
          Assigner · glisser sur le calendrier · clic sur le titre pour le dossier
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
  const { showToast } = useToast();
  const { user } = useAuth();
  const isDark = useIsDarkMode();
  const canAssign = hasPermission(user, "interventions.update");
  const [view, setView] = useState<ViewMode>("week");
  const [referenceDate, setReferenceDate] = useState(new Date());
  const dragRef = useRef<{ intervention: InterventionResponse; originDate: Date } | null>(null);
  const calendarAreaRef = useRef<HTMLDivElement>(null);
  const [calendarAreaHeight, setCalendarAreaHeight] = useState<number>();
  const [resizePreview, setResizePreview] = useState<{
    interventionId: string;
    height: number;
    end: Date;
  } | null>(null);
  const resizeSessionRef = useRef<{
    interventionId: string;
    day: Date;
    start: Date;
    dayColumnEl: HTMLElement;
    pointerId: number;
  } | null>(null);
  const suppressNextClickRef = useRef(false);
  const [assignBusyId, setAssignBusyId] = useState<string | null>(null);
  const [filterTeamId, setFilterTeamId] = useState("");
  const [filterTechnicianId, setFilterTechnicianId] = useState("");

  const weekDays = useMemo(() => getWeekDays(referenceDate), [referenceDate]);
  const timeGridDays = useMemo(() => {
    if (view === "day") return [startOfLocalDay(referenceDate)];
    return weekDays;
  }, [view, referenceDate, weekDays]);
  const monthWeeks = useMemo(
    () => getMonthDays(referenceDate.getFullYear(), referenceDate.getMonth()),
    [referenceDate],
  );

  const rangeStart = useMemo(() => {
    if (view === "day") return startOfLocalDay(referenceDate);
    if (view === "week") {
      const d = new Date(weekDays[0]);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    return new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  }, [view, weekDays, referenceDate]);

  const rangeEnd = useMemo(() => {
    if (view === "day") {
      const d = startOfLocalDay(referenceDate);
      d.setHours(23, 59, 59, 999);
      return d;
    }
    if (view === "week") {
      const d = new Date(weekDays[6]);
      d.setHours(23, 59, 59, 999);
      return d;
    }
    return new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0, 23, 59, 59, 999);
  }, [view, weekDays, referenceDate]);

  const { data: interventionsData } = useQuery({
    queryKey: ["calendar-interventions", rangeStart.toISOString(), rangeEnd.toISOString()],
    queryFn: () =>
      api.listInterventions({
        startDate: rangeStart.toISOString(),
        endDate: rangeEnd.toISOString(),
        limit: MAX_PAGE_LIMIT_WIDE,
      }),
  });
  const interventions = interventionsData?.interventions;

  const { data: teams } = useQuery({
    queryKey: ["fleet-teams"],
    queryFn: () => fleetApi.listTeams(),
  });

  const { data: technicians } = useQuery({
    queryKey: ["fleet-technicians"],
    queryFn: () => fleetApi.listTechnicians(),
  });

  const { data: orgUsersData } = useQuery({
    queryKey: ["organization-users"],
    queryFn: () => listOrganizationUsers(),
    retry: false,
  });

  const teamsById = useMemo(() => new Map((teams ?? []).map((t) => [t.id, t])), [teams]);

  const techniciansByAssigneeId = useMemo(() => {
    const map = new Map<string, TechnicianResponse>();
    for (const technician of technicians ?? []) {
      if (technician.userId) map.set(technician.userId, technician);
      map.set(technician.id, technician);
    }
    return map;
  }, [technicians]);

  const usersById = useMemo(() => {
    const map = new Map<string, string>();
    for (const user of orgUsersData?.users ?? []) {
      map.set(user.id, user.name?.trim() || user.email);
    }
    return map;
  }, [orgUsersData?.users]);

  const teamsSorted = useMemo(
    () =>
      [...(teams ?? [])]
        .filter((t) => t.status === "active")
        .sort((a, b) => a.name.localeCompare(b.name, "fr")),
    [teams],
  );

  const techniciansSorted = useMemo(
    () =>
      [...(technicians ?? [])]
        .filter((t) => t.status === "actif")
        .sort((a, b) =>
          `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "fr"),
        ),
    [technicians],
  );

  const filteredInterventions = useMemo(() => {
    const list = interventions ?? [];
    if (!filterTeamId && !filterTechnicianId) return list;

    return list.filter((i) => {
      if (filterTeamId && i.assignedTeamId !== filterTeamId) return false;
      if (filterTechnicianId) {
        const tech = techniciansByAssigneeId.get(filterTechnicianId);
        const matches =
          i.assigneeId === filterTechnicianId ||
          (tech?.userId != null && i.assigneeId === tech.userId) ||
          (tech != null && i.assigneeId === tech.id);
        if (!matches) return false;
      }
      return true;
    });
  }, [interventions, filterTeamId, filterTechnicianId, techniciansByAssigneeId]);

  const hasCalendarFilter = Boolean(filterTeamId || filterTechnicianId);

  const calendarFilterLabel = useMemo(() => {
    if (filterTeamId) {
      return `équipe « ${teamsById.get(filterTeamId)?.name ?? "…"} »`;
    }
    if (filterTechnicianId) {
      const t = techniciansByAssigneeId.get(filterTechnicianId);
      const name = t ? `${t.firstName} ${t.lastName}`.trim() : "…";
      return `technicien « ${name} »`;
    }
    return "";
  }, [filterTeamId, filterTechnicianId, teamsById, techniciansByAssigneeId]);

  const peopleOnCalendar = useMemo(() => {
    const ids = new Set<string>();
    for (const intervention of filteredInterventions) {
      if (!intervention.assignedTeamId && intervention.assigneeId) {
        ids.add(intervention.assigneeId);
      }
    }
    return [...ids]
      .map((id) => {
        const tech = techniciansByAssigneeId.get(id);
        const storedName = filteredInterventions.find(
          (intervention) => intervention.assigneeId === id,
        )?.assigneeName;
        const label =
          pickPersonDisplayLabel(
            tech ? `${tech.firstName} ${tech.lastName}` : null,
            usersById.get(id),
            storedName,
          ) ?? "Personne assignée";
        return {
          id,
          label,
          calendarColor: tech?.calendarColor,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label, "fr"));
  }, [filteredInterventions, techniciansByAssigneeId, usersById]);

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: api.UpdateInterventionPayload }) =>
      api.updateIntervention(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-interventions"] });
      queryClient.invalidateQueries({ queryKey: ["unscheduled-interventions"] });
    },
  });

  const handleQuickAssign = useCallback(
    (interventionId: string, payload: api.UpdateInterventionPayload) => {
      setAssignBusyId(interventionId);
      updateMutation.mutate(
        { id: interventionId, payload },
        {
          onSuccess: () => {
            showToast("Assignation mise à jour", "success");
          },
          onError: () => {
            showToast("Impossible de mettre à jour l'assignation", "error");
          },
          onSettled: () => setAssignBusyId(null),
        },
      );
    },
    [showToast, updateMutation],
  );
  const navigate = (direction: number) => {
    const d = new Date(referenceDate);
    if (view === "day") d.setDate(d.getDate() + direction);
    else if (view === "week") d.setDate(d.getDate() + direction * 7);
    else d.setMonth(d.getMonth() + direction);
    setReferenceDate(d);
  };

  const goToday = () => setReferenceDate(new Date());

  const getInterventionsForDay = useCallback(
    (date: Date) =>
      filteredInterventions.filter((i) => {
        if (!i.scheduledStart) return false;
        return isSameDay(new Date(i.scheduledStart), date);
      }),
    [filteredInterventions],
  );

  useLayoutEffect(() => {
    const el = calendarAreaRef.current;
    if (!el) return;

    const syncHeight = () => {
      setCalendarAreaHeight(el.getBoundingClientRect().height);
    };

    syncHeight();
    const observer = new ResizeObserver(syncHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, [view, referenceDate, interventions, monthWeeks]);

  const handleDragStart = (e: React.DragEvent, intervention: InterventionResponse) => {
    if (isInterventionScheduleLocked(intervention)) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", intervention.id);
    const fallback = new Date();
    fallback.setHours(9, 0, 0, 0);
    dragRef.current = {
      intervention,
      originDate: intervention.scheduledStart ? new Date(intervention.scheduledStart) : fallback,
    };
  };

  const handleDrop = (e: React.DragEvent, targetDate: Date, targetHour?: number) => {
    e.preventDefault();
    if (!dragRef.current) return;
    const { intervention, originDate } = dragRef.current;

    if (isInterventionScheduleLocked(intervention)) {
      showToast("Une intervention terminée ne peut plus être déplacée.", "error");
      dragRef.current = null;
      return;
    }

    const newStart = new Date(targetDate);
    if (targetHour !== undefined) {
      newStart.setHours(targetHour, 0, 0, 0);
    } else {
      newStart.setHours(originDate.getHours(), originDate.getMinutes(), 0, 0);
    }

    let newEnd: string | undefined;
    if (intervention.scheduledStart && intervention.scheduledEnd) {
      const duration =
        new Date(intervention.scheduledEnd).getTime() -
        new Date(intervention.scheduledStart).getTime();
      newEnd = new Date(newStart.getTime() + duration).toISOString();
    } else {
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
  };

  const handleDropToUnschedule = (interventionId: string) => {
    const fromDrag = dragRef.current?.intervention;
    const fromList = (interventions ?? []).find((i) => i.id === interventionId);
    const intervention = fromDrag?.id === interventionId ? fromDrag : fromList;
    if (intervention && isInterventionScheduleLocked(intervention)) {
      showToast("Une intervention terminée ne peut plus être déplanifiée.", "error");
      dragRef.current = null;
      return;
    }
    updateMutation.mutate({
      id: interventionId,
      payload: { scheduledStart: null, scheduledEnd: null },
    });
    dragRef.current = null;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleResizePointerDown = (
    e: React.PointerEvent,
    intervention: InterventionResponse,
    day: Date,
    start: Date,
  ) => {
    if (isInterventionScheduleLocked(intervention)) return;
    e.preventDefault();
    e.stopPropagation();

    const dayColumnEl = (e.currentTarget as HTMLElement).closest(
      "[data-day-column]",
    ) as HTMLElement | null;
    if (!dayColumnEl) return;

    const interventionId = intervention.id;
    resizeSessionRef.current = {
      interventionId,
      day,
      start,
      dayColumnEl,
      pointerId: e.pointerId,
    };

    const updatePreview = (clientY: number) => {
      const session = resizeSessionRef.current;
      if (!session) return;
      const end = clampEndAfterStart(
        session.start,
        pointerYToEndDate(session.day, clientY, session.dayColumnEl),
      );
      const startMin =
        session.start.getHours() * 60 + session.start.getMinutes() - WEEK_GRID_START_HOUR * 60;
      const endMin = end.getHours() * 60 + end.getMinutes() - WEEK_GRID_START_HOUR * 60;
      const height = Math.max(((endMin - Math.max(0, startMin)) / 60) * HOUR_HEIGHT_PX, 22);
      setResizePreview({ interventionId: session.interventionId, height, end });
    };

    updatePreview(e.clientY);

    const onMove = (ev: PointerEvent) => {
      ev.preventDefault();
      updatePreview(ev.clientY);
    };

    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);

      const session = resizeSessionRef.current;
      resizeSessionRef.current = null;
      setResizePreview(null);
      if (!session) return;

      const end = clampEndAfterStart(
        session.start,
        pointerYToEndDate(session.day, ev.clientY, session.dayColumnEl),
      );
      const prev = (interventions ?? []).find((i) => i.id === session.interventionId);
      const prevEndMs = prev?.scheduledEnd ? new Date(prev.scheduledEnd).getTime() : null;
      if (prevEndMs == null || Math.abs(prevEndMs - end.getTime()) >= 30_000) {
        updateMutation.mutate({
          id: session.interventionId,
          payload: {
            scheduledStart: session.start.toISOString(),
            scheduledEnd: end.toISOString(),
          },
        });
      }
      suppressNextClickRef.current = true;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  const today = new Date();

  const headerText = useMemo(() => {
    if (view === "day") {
      const d = startOfLocalDay(referenceDate);
      return `${DAY_NAMES_FULL[mondayBasedDow(d)]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    }
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
            Couleur de carte = équipe / personne assignée (ambre pointillé si aucune). Cliquez pour
            le dossier, glissez-déposez pour planifier, tirez le bas pour la durée, bouton Assigner
            pour l&apos;équipe ou le technicien.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <PermissionGate permission="exports.interventions">
            <ExportButton
              onExport={(format) =>
                exportsApi.exportInterventionsList(format, {
                  startDate: rangeStart.toISOString(),
                  endDate: rangeEnd.toISOString(),
                })
              }
            />
          </PermissionGate>
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              onClick={() => setView("day")}
              className={`px-3 py-1.5 text-xs font-medium transition ${
                view === "day"
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              Jour
            </button>
            <button
              onClick={() => setView("week")}
              className={`px-3 py-1.5 text-xs font-medium transition ${
                view === "week"
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              Semaine
            </button>
            <button
              onClick={() => setView("month")}
              className={`px-3 py-1.5 text-xs font-medium transition ${
                view === "month"
                  ? "bg-brand-600 text-white"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              Mois
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
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
          <span
            className="hidden sm:inline w-px h-6 bg-slate-200 dark:bg-slate-700 mx-0.5"
            aria-hidden
          />
          <select
            value={filterTeamId}
            onChange={(e) => {
              setFilterTeamId(e.target.value);
              if (e.target.value) setFilterTechnicianId("");
            }}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 max-w-[11rem]"
            aria-label="Filtrer par équipe"
          >
            <option value="">Toutes les équipes</option>
            {teamsSorted.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <select
            value={filterTechnicianId}
            onChange={(e) => {
              setFilterTechnicianId(e.target.value);
              if (e.target.value) setFilterTeamId("");
            }}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200 max-w-[11rem]"
            aria-label="Filtrer par technicien"
          >
            <option value="">Tous les techniciens</option>
            {techniciansSorted.map((tech) => (
              <option key={tech.id} value={tech.id}>
                {tech.firstName} {tech.lastName}
              </option>
            ))}
          </select>
          {hasCalendarFilter && (
            <button
              type="button"
              onClick={() => {
                setFilterTeamId("");
                setFilterTechnicianId("");
              }}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 underline-offset-2 hover:underline"
            >
              Réinitialiser
            </button>
          )}
        </div>
        <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{headerText}</div>
      </div>

      {hasCalendarFilter && (
        <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1">
          Filtre actif sur le calendrier · {calendarFilterLabel}. Le panneau « Non planifiées »
          reste complet.
        </p>
      )}

      <div className="flex flex-col lg:flex-row gap-4 lg:items-start">
        <div ref={calendarAreaRef} className="flex-1 min-w-0 w-full">
          {view === "week" || view === "day" ? (
            <div className="h-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm dark:shadow-slate-950/20 overflow-auto">
              <div
                className={`grid ${
                  view === "day"
                    ? "grid-cols-[60px_1fr] min-w-[320px]"
                    : "grid-cols-[60px_repeat(7,1fr)] min-w-[800px]"
                }`}
              >
                <div className="border-b border-r border-slate-200 dark:border-slate-700 p-2 sticky top-0 z-20 bg-white dark:bg-slate-900" />
                {timeGridDays.map((day, i) => {
                  const isToday = isSameDay(day, today);
                  const dow = mondayBasedDow(day);
                  return (
                    <div
                      key={i}
                      role={view === "week" ? "button" : undefined}
                      tabIndex={view === "week" ? 0 : undefined}
                      onClick={
                        view === "week"
                          ? () => {
                              setReferenceDate(startOfLocalDay(day));
                              setView("day");
                            }
                          : undefined
                      }
                      onKeyDown={
                        view === "week"
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setReferenceDate(startOfLocalDay(day));
                                setView("day");
                              }
                            }
                          : undefined
                      }
                      title={view === "week" ? "Voir cette journée" : undefined}
                      className={`border-b border-r border-slate-200 dark:border-slate-700 p-2 text-center text-xs font-medium sticky top-0 z-20 ${
                        isToday
                          ? "bg-brand-600/5 text-brand-600 dark:text-brand-400"
                          : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"
                      } ${view === "week" ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/80" : ""}`}
                    >
                      <div>{view === "day" ? DAY_NAMES_FULL[dow] : DAY_NAMES[dow]}</div>
                      <div
                        className={`${view === "day" ? "text-2xl" : "text-lg"} font-semibold ${isToday ? "text-brand-600 dark:text-brand-400" : "text-slate-800 dark:text-slate-100"}`}
                      >
                        {day.getDate()}
                        {view === "day" && (
                          <span className="ml-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                            {MONTH_NAMES[day.getMonth()]}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div className="relative border-r border-slate-100 dark:border-slate-800">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="border-b border-slate-100 dark:border-slate-800 px-1 text-[10px] text-slate-400 dark:text-slate-500 text-right pr-2"
                      style={{ height: HOUR_HEIGHT_PX }}
                    >
                      {hour}:00
                    </div>
                  ))}
                </div>

                {timeGridDays.map((day, dayIdx) => {
                  const dayEvents = layoutWeekDayEvents(getInterventionsForDay(day), day);
                  const isResizing = Boolean(resizePreview);
                  return (
                    <div
                      key={dayIdx}
                      data-day-column
                      className="relative border-r border-slate-100 dark:border-slate-800"
                      style={{ height: HOURS.length * HOUR_HEIGHT_PX }}
                    >
                      {HOURS.map((hour) => (
                        <div
                          key={hour}
                          className="absolute left-0 right-0 border-b border-slate-100 dark:border-slate-800"
                          style={{
                            top: (hour - WEEK_GRID_START_HOUR) * HOUR_HEIGHT_PX,
                            height: HOUR_HEIGHT_PX,
                          }}
                          onDragOver={isResizing ? undefined : handleDragOver}
                          onDrop={isResizing ? undefined : (e) => handleDrop(e, day, hour)}
                        />
                      ))}
                      {dayEvents.map(
                        ({ intervention, top, height, start, end, lane, laneCount }) => {
                          const appearance = resolveInterventionCardAppearance(
                            intervention,
                            teamsById,
                            techniciansByAssigneeId,
                            isDark,
                          );
                          const scheduleLocked = isInterventionScheduleLocked(intervention);
                          const widthPct = 100 / laneCount;
                          const leftPct = lane * widthPct;
                          const preview =
                            resizePreview?.interventionId === intervention.id
                              ? resizePreview
                              : null;
                          const displayHeight = preview?.height ?? height;
                          const displayEnd = preview?.end ?? end;
                          const timeLabel = `${formatClock(start)}–${formatClock(displayEnd)}`;
                          const resizingThis = Boolean(preview);
                          const unassigned = isInterventionUnassigned(intervention);
                          const showAssignInline = view === "day" || displayHeight >= 52;
                          return (
                            <div
                              key={intervention.id}
                              className={`absolute z-10 box-border overflow-visible rounded-md text-[10px] leading-tight shadow-sm ${appearance.className}`}
                              style={{
                                ...appearance.style,
                                top,
                                height: displayHeight,
                                left: `calc(${leftPct}% + 2px)`,
                                width: `calc(${widthPct}% - 4px)`,
                              }}
                            >
                              <Link
                                href={`/cases/${intervention.caseId}`}
                                draggable={!scheduleLocked && !resizingThis}
                                onDragStart={(e) => handleDragStart(e, intervention)}
                                onClick={(e) => {
                                  if (suppressNextClickRef.current) {
                                    e.preventDefault();
                                    suppressNextClickRef.current = false;
                                  }
                                }}
                                className={`absolute inset-0 overflow-hidden rounded-md px-1.5 pt-1 pb-2 no-underline text-inherit ${
                                  scheduleLocked
                                    ? "cursor-pointer"
                                    : resizingThis
                                      ? "cursor-ns-resize"
                                      : "cursor-grab active:cursor-grabbing"
                                }`}
                                title={
                                  scheduleLocked
                                    ? `Intervention terminée — dates non modifiables — ${intervention.title} (${timeLabel})`
                                    : `Ouvrir le dossier — ${intervention.title}${intervention.caseTitle ? ` (${intervention.caseTitle})` : ""}${intervention.assignedTeamName ? ` · ${intervention.assignedTeamName}` : ""}${unassigned ? " · Sans assignation" : ""} · ${timeLabel}`
                                }
                              >
                                <span className="flex items-start gap-1 min-w-0 pointer-events-none pr-1">
                                  <span
                                    className={`mt-0.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ring-1 ring-white/50 dark:ring-black/20 ${STATUS_DOT[intervention.status] ?? "bg-slate-400"}`}
                                    aria-hidden
                                  />
                                  <span className="min-w-0 flex-1 overflow-hidden">
                                    <span
                                      className={`block truncate font-medium text-inherit ${view === "day" ? "text-xs" : ""}`}
                                    >
                                      {intervention.title}
                                    </span>
                                    {displayHeight >= 36 && (
                                      <span className="block truncate opacity-80 text-inherit">
                                        {timeLabel}
                                        {view === "day" &&
                                          (intervention.assignedTeamName ||
                                            intervention.assigneeName) && (
                                            <>
                                              {" "}
                                              ·{" "}
                                              {intervention.assignedTeamName ??
                                                intervention.assigneeName}
                                            </>
                                          )}
                                      </span>
                                    )}
                                  </span>
                                </span>
                              </Link>
                              {canAssign && !scheduleLocked && (
                                <div
                                  className={`absolute z-30 pointer-events-auto ${
                                    showAssignInline
                                      ? "left-1 right-1 bottom-3"
                                      : "top-0.5 right-0.5 max-w-[70%]"
                                  }`}
                                >
                                  <QuickAssignControl
                                    compact={!showAssignInline}
                                    intervention={intervention}
                                    teams={teamsSorted}
                                    technicians={technicians ?? []}
                                    busy={assignBusyId === intervention.id}
                                    onAssign={(payload) =>
                                      handleQuickAssign(intervention.id, payload)
                                    }
                                  />
                                </div>
                              )}
                              {!scheduleLocked && (
                                <span
                                  role="separator"
                                  aria-orientation="horizontal"
                                  aria-label="Allonger ou raccourcir la durée"
                                  title="Glisser pour modifier la durée"
                                  className="absolute inset-x-0 bottom-0 z-20 flex h-2.5 cursor-ns-resize items-end justify-center pb-0.5 pointer-events-auto"
                                  draggable={false}
                                  onPointerDown={(ev) =>
                                    handleResizePointerDown(ev, intervention, day, start)
                                  }
                                  onClick={(ev) => {
                                    ev.preventDefault();
                                    ev.stopPropagation();
                                  }}
                                >
                                  <span
                                    className="h-0.5 w-6 rounded-full bg-current opacity-40"
                                    aria-hidden
                                  />
                                </span>
                              )}
                            </div>
                          );
                        },
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm dark:shadow-slate-950/20 overflow-hidden">
              <div className="grid grid-cols-7">
                {DAY_NAMES.map((day) => (
                  <div
                    key={day}
                    className="border-b border-slate-200 dark:border-slate-700 p-2 text-center text-xs font-medium text-slate-600 dark:text-slate-300"
                  >
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
                          !day
                            ? "bg-slate-50 dark:bg-slate-950/50"
                            : isToday
                              ? "bg-brand-600/5"
                              : ""
                        }`}
                        onDragOver={day ? handleDragOver : undefined}
                        onDrop={day ? (e) => handleDrop(e, day) : undefined}
                      >
                        {day && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setReferenceDate(startOfLocalDay(day));
                                setView("day");
                              }}
                              title="Voir cette journée"
                              className={`text-xs font-medium mb-1 rounded px-1 -ml-1 hover:bg-slate-100 dark:hover:bg-slate-800 ${isToday ? "text-brand-600 dark:text-brand-400" : "text-slate-600 dark:text-slate-300"}`}
                            >
                              {day.getDate()}
                            </button>
                            <div className="space-y-0.5">
                              {dayInterventions.slice(0, 3).map((intervention) => {
                                const appearance = resolveInterventionCardAppearance(
                                  intervention,
                                  teamsById,
                                  techniciansByAssigneeId,
                                  isDark,
                                );
                                const scheduleLocked = isInterventionScheduleLocked(intervention);
                                return (
                                  <Link
                                    key={intervention.id}
                                    href={`/cases/${intervention.caseId}`}
                                    draggable={!scheduleLocked}
                                    onDragStart={(e) => handleDragStart(e, intervention)}
                                    className={`flex items-center gap-1 rounded px-0.5 py-0.5 -mx-0.5 no-underline min-w-0 text-inherit ${
                                      scheduleLocked
                                        ? "cursor-pointer"
                                        : "cursor-grab active:cursor-grabbing"
                                    } ${appearance.className}`}
                                    style={appearance.style}
                                    title={
                                      scheduleLocked
                                        ? `Intervention terminée — dates non modifiables — ${intervention.title}`
                                        : `Ouvrir le dossier — ${intervention.title}${intervention.caseTitle ? ` (${intervention.caseTitle})` : ""}${intervention.assignedTeamName ? ` · ${intervention.assignedTeamName}` : ""}`
                                    }
                                  >
                                    <span
                                      className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ring-1 ring-white/50 dark:ring-black/20 ${STATUS_DOT[intervention.status] ?? "bg-slate-400"}`}
                                      aria-hidden
                                    />
                                    <span className="text-[10px] truncate text-inherit">
                                      {intervention.title}
                                    </span>
                                  </Link>
                                );
                              })}
                              {dayInterventions.length > 3 && (
                                <div className="text-[10px] text-slate-400 dark:text-slate-500">
                                  +{dayInterventions.length - 3} autre
                                  {dayInterventions.length - 3 > 1 ? "s" : ""}
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
        </div>

        <UnscheduledPanel
          onDragStart={handleDragStart}
          onDropToUnschedule={handleDropToUnschedule}
          teamsById={teamsById}
          techniciansByAssigneeId={techniciansByAssigneeId}
          teams={teamsSorted}
          technicians={technicians ?? []}
          onAssign={handleQuickAssign}
          canAssign={canAssign}
          assignBusyId={assignBusyId}
          isDark={isDark}
          calendarHeight={calendarAreaHeight}
        />
      </div>

      <div className="flex flex-col gap-3 text-xs text-slate-500 dark:text-slate-400">
        <p>
          <span className="font-medium text-slate-600 dark:text-slate-300">Couleur des cartes</span>{" "}
          — selon l&apos;équipe ou la personne assignée.{" "}
          <span className="font-medium text-amber-800 dark:text-amber-200">
            Sans assignation : ambre, bordure en pointillés
          </span>
          . Couleurs personnalisables sur les fiches équipe / technicien (Flotte).
        </p>
        <p className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] ${
              isDark
                ? "bg-amber-950/55 text-amber-50 border-2 border-dashed border-amber-500/90"
                : "bg-amber-50 text-amber-950 border-2 border-dashed border-amber-400"
            }`}
          >
            Exemple sans assignation
          </span>
          <span className="text-slate-500 dark:text-slate-400">
            Bouton <span className="font-medium">Assigner</span> pour choisir une équipe ou un
            technicien sans quitter le planning.
          </span>
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
                      style={teamLegendSwatchStyle(t.calendarColor, isDark)}
                      aria-hidden
                    />
                  ) : (
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded shrink-0 ${getTeamCalendarCardClasses(t.id, isDark)}`}
                      aria-hidden
                    />
                  )}
                  <span className="truncate text-slate-700 dark:text-slate-200" title={t.name}>
                    {t.name}
                  </span>
                  {!t.calendarColor && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                      (auto)
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {peopleOnCalendar.length > 0 && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/50 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
              Légende personnes
            </p>
            <ul className="flex flex-wrap gap-x-4 gap-y-2">
              {peopleOnCalendar.map((person) => (
                <li key={person.id} className="flex items-center gap-2 min-w-0 max-w-[220px]">
                  {person.calendarColor && normalizeCalendarColorHex(person.calendarColor) ? (
                    <span
                      className="team-cal-legend-swatch h-3.5 w-3.5 rounded shrink-0"
                      style={teamLegendSwatchStyle(person.calendarColor, isDark)}
                      aria-hidden
                    />
                  ) : (
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded shrink-0 ${getTeamCalendarCardClasses(person.id, isDark)}`}
                      aria-hidden
                    />
                  )}
                  <span
                    className="truncate text-slate-700 dark:text-slate-200"
                    title={person.label}
                  >
                    {person.label}
                  </span>
                  {!person.calendarColor && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                      (auto)
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-medium text-slate-600 dark:text-slate-300 mr-1">
            Statut (point)
          </span>
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
  );
}
