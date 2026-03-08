"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/dossiers.api";
import type { DossierPriority, DossierStatus } from "@syncora/shared";

const STATUS_LABELS: Record<DossierStatus, string> = {
  draft: "Brouillon",
  open: "Ouvert",
  in_progress: "En cours",
  waiting: "En attente",
  completed: "Terminé",
  cancelled: "Annulé"
};

const STATUS_COLORS: Record<DossierStatus, string> = {
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  open: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  waiting: "bg-purple-50 text-purple-700 border-purple-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-600 border-red-200"
};

const PRIORITY_LABELS: Record<DossierPriority, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  urgent: "Urgente"
};

const PRIORITY_COLORS: Record<DossierPriority, string> = {
  low: "bg-slate-100 text-slate-500",
  medium: "bg-blue-50 text-blue-600",
  high: "bg-orange-50 text-orange-600",
  urgent: "bg-red-50 text-red-600"
};

export function DossiersListPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [search, setSearch] = useState("");

  const { data: dossiers, isLoading } = useQuery({
    queryKey: ["dossiers", statusFilter, priorityFilter, search],
    queryFn: () =>
      api.listDossiers({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        search: search || undefined
      })
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dossiers</h1>
          <p className="text-sm text-slate-500">
            Gérez le cycle de vie complet de vos dossiers.
          </p>
        </div>
        <Link
          href="/dossiers/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
        >
          Nouveau dossier
        </Link>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un dossier…"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-64"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">Tous les statuts</option>
          {(Object.keys(STATUS_LABELS) as DossierStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">Toutes les priorités</option>
          {(Object.keys(PRIORITY_LABELS) as DossierPriority[]).map((p) => (
            <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="text-sm text-slate-500">Chargement…</div>
      ) : !dossiers?.length ? (
        <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/50 p-8 text-center">
          <p className="text-slate-600 mb-2">Aucun dossier trouvé</p>
          <p className="text-sm text-slate-500">
            Créez votre premier dossier pour commencer le suivi.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {dossiers.map((dossier) => (
            <Link
              key={dossier.id}
              href={`/dossiers/${dossier.id}`}
              className="block rounded-xl border border-blue-100 bg-white p-4 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-800 truncate">{dossier.title}</h3>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[dossier.status]
                      }`}
                    >
                      {STATUS_LABELS[dossier.status]}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        PRIORITY_COLORS[dossier.priority]
                      }`}
                    >
                      {PRIORITY_LABELS[dossier.priority]}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                    {dossier.assigneeName && (
                      <span>Assigné à : {dossier.assigneeName}</span>
                    )}
                    {dossier.dueDate && (
                      <span>
                        Échéance : {new Date(dossier.dueDate).toLocaleDateString("fr-FR")}
                      </span>
                    )}
                    <span>{dossier.interventionCount} intervention{dossier.interventionCount !== 1 ? "s" : ""}</span>
                    {dossier.tags.length > 0 && (
                      <span className="flex gap-1">
                        {dossier.tags.map((t) => (
                          <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px]">{t}</span>
                        ))}
                      </span>
                    )}
                  </div>

                  {dossier.nextTodo && (
                    <div className="mt-2 text-xs text-amber-600">
                      Prochaine tâche : {dossier.nextTodo}
                    </div>
                  )}
                </div>

                <div className="ml-4 flex flex-col items-end gap-1">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-700">{dossier.progress}%</div>
                    <div className="w-20 h-1.5 rounded-full bg-slate-100 mt-1">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all"
                        style={{ width: `${dossier.progress}%` }}
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
