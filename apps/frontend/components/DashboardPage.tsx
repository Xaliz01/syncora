"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthContext";
import * as api from "@/lib/dossiers.api";
import type { DossierStatus } from "@syncora/shared";

const STATUS_LABELS: Record<DossierStatus, string> = {
  draft: "Brouillon",
  open: "Ouvert",
  in_progress: "En cours",
  waiting: "En attente",
  completed: "Terminé",
  cancelled: "Annulé"
};

const STATUS_COLORS: Record<DossierStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  open: "bg-blue-50 text-blue-700",
  in_progress: "bg-amber-50 text-amber-700",
  waiting: "bg-purple-50 text-purple-700",
  completed: "bg-green-50 text-green-700",
  cancelled: "bg-red-50 text-red-600"
};


export function DashboardPage() {
  const { user } = useAuth();

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.getDashboard(),
    refetchInterval: 60000
  });

  if (isLoading) {
    return <div className="text-sm text-slate-500">Chargement du tableau de bord…</div>;
  }

  const stats = dashboard?.stats;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bonjour{user?.name ? `, ${user.name}` : ""}</h1>
        <p className="text-sm text-slate-500">
          Voici un résumé de votre activité et de vos tâches en cours.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500 mb-1">Dossiers assignés</div>
          <div className="text-2xl font-bold text-slate-800">{stats?.totalAssigned ?? 0}</div>
        </div>
        <div className="rounded-xl border border-amber-100 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500 mb-1">En cours</div>
          <div className="text-2xl font-bold text-amber-600">{stats?.inProgress ?? 0}</div>
        </div>
        <div className="rounded-xl border border-green-100 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500 mb-1">Terminés cette semaine</div>
          <div className="text-2xl font-bold text-green-600">{stats?.completedThisWeek ?? 0}</div>
        </div>
        <div className="rounded-xl border border-red-100 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500 mb-1">En retard</div>
          <div className={`text-2xl font-bold ${(stats?.overdue ?? 0) > 0 ? "text-red-600" : "text-slate-800"}`}>
            {stats?.overdue ?? 0}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Dossiers en retard */}
        {(dashboard?.overdueDossiers?.length ?? 0) > 0 && (
          <div className="rounded-xl border border-red-100 bg-white p-4 shadow-sm lg:col-span-2">
            <h2 className="text-base font-semibold text-red-700 mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              Dossiers en retard
            </h2>
            <div className="space-y-2">
              {dashboard!.overdueDossiers.map((d) => (
                <Link
                  key={d.id}
                  href={`/dossiers/${d.id}`}
                  className="flex items-center justify-between rounded-lg border border-red-50 bg-red-50/30 p-3 hover:bg-red-50 transition"
                >
                  <div>
                    <div className="text-sm font-medium text-slate-800">{d.title}</div>
                    <div className="text-xs text-red-600">
                      Échéance : {d.dueDate ? new Date(d.dueDate).toLocaleDateString("fr-FR") : "—"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-slate-700">{d.progress}%</div>
                    {d.nextTodo && (
                      <div className="text-[10px] text-slate-500 max-w-[200px] truncate">
                        Prochaine : {d.nextTodo}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Mes dossiers actifs */}
        <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-800">Mes dossiers actifs</h2>
            <Link href="/dossiers" className="text-xs text-blue-600 hover:text-blue-700">
              Voir tout
            </Link>
          </div>
          {!dashboard?.assignedDossiers?.length ? (
            <p className="text-sm text-slate-500">Aucun dossier assigné.</p>
          ) : (
            <div className="space-y-2">
              {dashboard.assignedDossiers.slice(0, 8).map((d) => (
                <Link
                  key={d.id}
                  href={`/dossiers/${d.id}`}
                  className="flex items-center justify-between rounded-lg border border-blue-50 p-3 hover:bg-blue-50/50 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800 truncate">{d.title}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[d.status]}`}>
                        {STATUS_LABELS[d.status]}
                      </span>
                    </div>
                    {d.nextTodo && (
                      <div className="text-xs text-amber-600 mt-0.5 truncate">
                        A faire : {d.nextTodo}
                      </div>
                    )}
                  </div>
                  <div className="ml-3 flex flex-col items-end">
                    <div className="text-xs font-medium text-slate-600">{d.progress}%</div>
                    <div className="w-12 h-1 rounded-full bg-slate-100 mt-1">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${d.progress}%` }}
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Prochaines interventions */}
        <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-800">Prochaines interventions</h2>
            <Link href="/dossiers/calendar" className="text-xs text-blue-600 hover:text-blue-700">
              Calendrier
            </Link>
          </div>
          {!dashboard?.upcomingInterventions?.length ? (
            <p className="text-sm text-slate-500">Aucune intervention à venir.</p>
          ) : (
            <div className="space-y-2">
              {dashboard.upcomingInterventions.slice(0, 8).map((i) => (
                <Link
                  key={i.id}
                  href={`/dossiers/${i.dossierId}`}
                  className="flex items-center justify-between rounded-lg border border-blue-50 p-3 hover:bg-blue-50/50 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-800 truncate">{i.title}</div>
                    {i.dossierTitle && (
                      <div className="text-xs text-slate-500 truncate">{i.dossierTitle}</div>
                    )}
                  </div>
                  <div className="ml-3 text-right flex-shrink-0">
                    {i.scheduledStart && (
                      <div className="text-xs text-slate-600">
                        {new Date(i.scheduledStart).toLocaleDateString("fr-FR")}
                      </div>
                    )}
                    {i.scheduledStart && (
                      <div className="text-[10px] text-slate-400">
                        {new Date(i.scheduledStart).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800 mb-3">Actions rapides</h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dossiers/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
          >
            Nouveau dossier
          </Link>
          <Link
            href="/dossiers"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
          >
            Tous les dossiers
          </Link>
          <Link
            href="/dossiers/calendar"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
          >
            Calendrier
          </Link>
          <Link
            href="/dossiers/templates"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
          >
            Modèles de dossier
          </Link>
        </div>
      </div>
    </div>
  );
}
