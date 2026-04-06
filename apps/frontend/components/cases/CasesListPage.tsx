"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/cases.api";
import type { CasePriority, CaseStatus } from "@syncora/shared";
import {
  ListBadge,
  ListCellDefault,
  ListCellMuted,
  ListCellPrimary,
  ListEmptyState,
  ListLoadingState,
  ListNoResults,
  ListPageHeader,
  ListPageRoot,
  ListPrimaryAction,
  ListRowLink,
  ListSearchField,
  ListTableShell,
  ListToolbar
} from "@/components/ui/list-page";

const STATUS_LABELS: Record<CaseStatus, string> = {
  draft: "Brouillon",
  open: "Ouvert",
  in_progress: "En cours",
  waiting: "En attente",
  completed: "Terminé",
  cancelled: "Annulé"
};

const STATUS_COLORS: Record<CaseStatus, string> = {
  draft: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
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
  low: "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700",
  medium: "bg-blue-50 text-blue-600 border-blue-200",
  high: "bg-orange-50 text-orange-600 border-orange-200",
  urgent: "bg-red-50 text-red-600 border-red-200"
};

const GRID = "md:grid-cols-[1.4fr_1fr_0.75fr_0.75fr_0.45fr]";

export function CasesListPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [search, setSearch] = useState("");

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ["cases", statusFilter, priorityFilter, search],
    queryFn: () =>
      api.listCases({
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
        search: search || undefined
      })
  });

  const hasActiveFilters = Boolean(statusFilter || priorityFilter || search.trim());

  return (
    <ListPageRoot>
      <ListPageHeader
        title="Dossiers"
        description="Gérez le cycle de vie complet de vos dossiers."
        action={<ListPrimaryAction href="/cases/new">Nouveau dossier</ListPrimaryAction>}
      />

      <ListToolbar>
        <ListSearchField
          value={search}
          onChange={setSearch}
          placeholder="Rechercher un dossier (titre, client, tags…)…"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 w-full sm:w-auto"
        >
          <option value="">Tous les statuts</option>
          {(Object.keys(STATUS_LABELS) as CaseStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 w-full sm:w-auto"
        >
          <option value="">Toutes les priorités</option>
          {(Object.keys(PRIORITY_LABELS) as CasePriority[]).map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABELS[p]}
            </option>
          ))}
        </select>
      </ListToolbar>

      {isLoading ? (
        <ListLoadingState />
      ) : cases.length === 0 && hasActiveFilters ? (
        <ListNoResults />
      ) : cases.length === 0 ? (
        <ListEmptyState
          message="Aucun dossier pour le moment."
          action={
            <Link href="/cases/new" className="text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium">
              Créer un dossier
            </Link>
          }
        />
      ) : (
        <ListTableShell
          gridTemplateClass={GRID}
          headerCells={
            <>
              <span>Dossier</span>
              <span>Client</span>
              <span>Statut</span>
              <span>Priorité</span>
              <span>Avancement</span>
            </>
          }
        >
          {cases.map((c) => (
            <ListRowLink key={c.id} href={`/cases/${c.id}`} gridTemplateClass={GRID}>
              <div className="min-w-0">
                <ListCellPrimary className="block">{c.title}</ListCellPrimary>
                {c.nextTodo ? (
                  <p className="text-[11px] text-amber-600 mt-0.5 truncate">Prochaine tâche : {c.nextTodo}</p>
                ) : null}
              </div>
              <ListCellMuted>{c.customer?.displayName ?? "—"}</ListCellMuted>
              <ListBadge className={STATUS_COLORS[c.status]}>{STATUS_LABELS[c.status]}</ListBadge>
              <ListBadge className={PRIORITY_COLORS[c.priority]}>{PRIORITY_LABELS[c.priority]}</ListBadge>
              <ListCellDefault>{c.progress}%</ListCellDefault>
            </ListRowLink>
          ))}
        </ListTableShell>
      )}
    </ListPageRoot>
  );
}
