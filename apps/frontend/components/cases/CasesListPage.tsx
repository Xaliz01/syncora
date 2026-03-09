"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/cases.api";
import type { CasePriority, CaseStatus } from "@syncora/shared";

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

const PRIORITY_COLORS: Record<CasePriority, string> = {
  low: "bg-slate-100 text-slate-500",
  medium: "bg-blue-50 text-blue-600",
  high: "bg-orange-50 text-orange-600",
  urgent: "bg-red-50 text-red-600"
};

export function CasesListPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [search, setSearch] = useState("");

  const { data: cases, isLoading } = useQuery({
    queryKey: ["cases", statusFilter, priorityFilter, search],
    queryFn: () =>
      api.listCases({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        search: search || undefined
      })
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Dossiers</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gérez le cycle de vie complet de vos dossiers.
          </p>
        </div>
        <Link
          href="/cases/new"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 transition self-start flex-shrink-0"
        >
          Nouveau dossier
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un dossier…"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 w-full sm:w-64"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">Tous les statuts</option>
          {(Object.keys(STATUS_LABELS) as CaseStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">Toutes les priorités</option>
          {(Object.keys(PRIORITY_LABELS) as CasePriority[]).map((p) => (
            <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="text-sm text-slate-500">Chargement…</div>
      ) : !cases?.length ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="text-slate-600 mb-2">Aucun dossier trouvé</p>
          <p className="text-sm text-slate-500">
            Créez votre premier dossier pour commencer le suivi.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((c) => (
            <Link
              key={c.id}
              href={`/cases/${c.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-800 truncate">{c.title}</h3>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[c.status]
                      }`}
                    >
                      {STATUS_LABELS[c.status]}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        PRIORITY_COLORS[c.priority]
                      }`}
                    >
                      {PRIORITY_LABELS[c.priority]}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    {c.assigneeName && (
                      <span>Assigné à : {c.assigneeName}</span>
                    )}
                    {c.dueDate && (
                      <span>
                        Échéance : {new Date(c.dueDate).toLocaleDateString("fr-FR")}
                      </span>
                    )}
                    <span>{c.interventionCount} intervention{c.interventionCount !== 1 ? "s" : ""}</span>
                    {c.tags.length > 0 && (
                      <span className="flex gap-1">
                        {c.tags.map((t) => (
                          <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px]">{t}</span>
                        ))}
                      </span>
                    )}
                  </div>

                  {c.nextTodo && (
                    <div className="mt-2 text-xs text-amber-600">
                      Prochaine tâche : {c.nextTodo}
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-700">{c.progress}%</div>
                    <div className="w-16 sm:w-20 h-1.5 rounded-full bg-slate-100 mt-1">
                      <div
                        className="h-full rounded-full bg-brand-600 transition-all"
                        style={{ width: `${c.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
