"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { MaintenanceContractStatus } from "@planwise/shared";
import { MAINTENANCE_SCHEDULING_MODE_LABELS } from "@planwise/shared";
import * as contractsApi from "@/lib/maintenance-contracts.api";
import { PermissionGate } from "@/components/auth/PermissionGate";
import {
  ListPageError,
  ListPageHeader,
  ListPagination,
  LIST_PAGE_SIZE,
} from "@/components/ui/list-page";

const STATUS_LABELS: Record<MaintenanceContractStatus, string> = {
  draft: "Brouillon",
  active: "Actif",
  suspended: "Suspendu",
  ended: "Terminé",
};

export function MaintenanceContractsListPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<string>("");
  const [toSchedule, setToSchedule] = useState(false);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (searchParams.get("filter") === "to_schedule") {
      setToSchedule(true);
      setStatus("active");
    }
  }, [searchParams]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["maintenance-contracts", status, toSchedule, offset],
    queryFn: () =>
      contractsApi.listMaintenanceContracts({
        status: status || undefined,
        toSchedule: toSchedule || undefined,
        limit: LIST_PAGE_SIZE,
        offset,
      }),
  });

  const contracts = data?.contracts ?? [];
  const total = data?.total ?? 0;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      <ListPageHeader
        title="Contrats de maintenance"
        description="Suivi des contrats récurrents et planification des visites."
        action={
          <PermissionGate permission="contracts.create">
            <Link
              href="/contracts/new"
              className="inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500"
            >
              Nouveau contrat
            </Link>
          </PermissionGate>
        }
      />

      <div className="flex flex-wrap gap-3">
        <label className="text-sm text-slate-600 dark:text-slate-300">
          Statut{" "}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setOffset(0);
            }}
            className="ml-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="">Tous</option>
            {(Object.keys(STATUS_LABELS) as MaintenanceContractStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={toSchedule}
            onChange={(e) => {
              setToSchedule(e.target.checked);
              setOffset(0);
            }}
          />
          Visites à programmer
        </label>
      </div>

      {error ? (
        <ListPageError
          message={error instanceof Error ? error.message : undefined}
          fallbackMessage="Impossible de charger les contrats."
        />
      ) : null}

      {isLoading ? (
        <p className="text-sm text-slate-500">Chargement…</p>
      ) : contracts.length === 0 ? (
        <p className="text-sm text-slate-500">Aucun contrat pour le moment.</p>
      ) : (
        <ListPagination
          offset={offset}
          limit={LIST_PAGE_SIZE}
          total={total}
          onOffsetChange={setOffset}
        >
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
            {contracts.map((c) => {
              const overdue = c.status === "active" && c.nextDueDate < today;
              const pending =
                c.schedulingMode === "schedule_with_client" && (c.schedulingPending || overdue);
              return (
                <li key={c.id}>
                  <Link
                    href={`/contracts/${c.id}`}
                    className="flex flex-col gap-1 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">{c.title}</p>
                      <p className="text-xs text-slate-500">
                        Prochaine visite : {c.nextDueDate} · tous les {c.recurrenceMonths} mois ·{" "}
                        {MAINTENANCE_SCHEDULING_MODE_LABELS[c.schedulingMode]}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {pending ? (
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                          À programmer
                        </span>
                      ) : null}
                      {overdue ? (
                        <span className="text-xs font-medium text-red-600 dark:text-red-400">
                          En retard
                        </span>
                      ) : null}
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        {STATUS_LABELS[c.status]}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </ListPagination>
      )}
    </div>
  );
}
