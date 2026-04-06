"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/auth/AuthContext";
import * as api from "@/lib/cases.api";
import type { CaseStatus } from "@syncora/shared";

const STATUS_LABELS: Record<CaseStatus, string> = {
  draft: "Brouillon",
  open: "Ouvert",
  in_progress: "En cours",
  waiting: "En attente",
  completed: "Terminé",
  cancelled: "Annulé"
};

const STATUS_COLORS: Record<CaseStatus, string> = {
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
        <h1 className="text-xl sm:text-2xl font-semibold">Bonjour{user?.name ? `, ${user.name}` : ""}</h1>
        <p className="text-sm text-slate-500 mt-1">
          Voici un résumé de votre activité et de vos tâches en cours.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500 mb-1">Dossiers assignés</div>
          <div className="text-2xl font-bold text-slate-800">{stats?.totalAssigned ?? 0}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500 mb-1">En cours</div>
          <div className="text-2xl font-bold text-amber-600">{stats?.inProgress ?? 0}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500 mb-1">Terminés cette semaine</div>
          <div className="text-2xl font-bold text-green-600">{stats?.completedThisWeek ?? 0}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500 mb-1">En retard</div>
          <div className={`text-2xl font-bold ${(stats?.overdue ?? 0) > 0 ? "text-red-600" : "text-slate-800"}`}>
            {stats?.overdue ?? 0}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {(dashboard?.overdueCases?.length ?? 0) > 0 && (
          <div className="rounded-xl border border-red-200 bg-white p-4 shadow-sm lg:col-span-2">
            <h2 className="text-base font-semibold text-red-700 mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              Dossiers en retard
            </h2>
            <div className="space-y-2">
              {dashboard!.overdueCases.map((c) => (
                <Link
                  key={c.id}
                  href={`/cases/${c.id}`}
                  className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50/30 p-3 hover:bg-red-50 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-800 truncate">{c.title}</div>
                    {c.customer?.displayName && (
                      <div className="text-xs text-slate-600 truncate">Client : {c.customer.displayName}</div>
                    )}
                    <div className="text-xs text-red-600">
                      Échéance : {c.dueDate ? new Date(c.dueDate).toLocaleDateString("fr-FR") : "—"}
                    </div>
                  </div>
                  <div className="text-right ml-3 flex-shrink-0">
                    <div className="text-sm font-semibold text-slate-700">{c.progress}%</div>
                    {c.nextTodo && (
                      <div className="text-[10px] text-slate-500 max-w-[200px] truncate hidden sm:block">
                        Prochaine : {c.nextTodo}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-800">Mes dossiers actifs</h2>
            <Link href="/cases" className="text-xs text-brand-600 hover:text-brand-500 font-medium">
              Voir tout
            </Link>
          </div>
          {!dashboard?.assignedCases?.length ? (
            <p className="text-sm text-slate-500">Aucun dossier assigné.</p>
          ) : (
            <div className="space-y-2">
              {dashboard.assignedCases.slice(0, 8).map((c) => (
                <Link
                  key={c.id}
                  href={`/cases/${c.id}`}
                  className="flex items-center justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800 truncate">{c.title}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium flex-shrink-0 ${STATUS_COLORS[c.status]}`}>
                        {STATUS_LABELS[c.status]}
                      </span>
                    </div>
                    {c.customer?.displayName && (
                      <div className="text-xs text-slate-500 truncate">Client : {c.customer.displayName}</div>
                    )}
                    {c.nextTodo && (
                      <div className="text-xs text-amber-600 mt-0.5 truncate">
                        A faire : {c.nextTodo}
                      </div>
                    )}
                  </div>
                  <div className="ml-3 flex flex-col items-end flex-shrink-0">
                    <div className="text-xs font-medium text-slate-600">{c.progress}%</div>
                    <div className="w-12 h-1 rounded-full bg-slate-100 mt-1">
                      <div
                        className="h-full rounded-full bg-brand-600"
                        style={{ width: `${c.progress}%` }}
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-800">Prochaines interventions</h2>
            <Link href="/cases/calendar" className="text-xs text-brand-600 hover:text-brand-500 font-medium">
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
                  href={`/cases/${i.caseId}`}
                  className="flex items-center justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-800 truncate">{i.title}</div>
                    {i.caseTitle && (
                      <div className="text-xs text-slate-500 truncate">{i.caseTitle}</div>
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

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800 mb-3">Actions rapides</h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/cases/new"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 transition"
          >
            Nouveau dossier
          </Link>
          <Link
            href="/cases"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
          >
            Tous les dossiers
          </Link>
          <Link
            href="/cases/calendar"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
          >
            Calendrier
          </Link>
          <Link
            href="/settings/case-templates"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
          >
            Modèles de dossier
          </Link>
        </div>
      </div>
    </div>
  );
}
