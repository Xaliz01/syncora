"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import * as contractsApi from "@/lib/maintenance-contracts.api";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { useAuth } from "@/components/auth/AuthContext";
import { hasPermission } from "@/lib/auth-permissions";

export function CustomerContractsSection({ customerId }: { customerId: string }) {
  const { user } = useAuth();
  const canRead = hasPermission(user, "contracts.read");

  const { data, isLoading } = useQuery({
    queryKey: ["maintenance-contracts", "customer", customerId],
    queryFn: () => contractsApi.listMaintenanceContracts({ customerId, limit: 20, offset: 0 }),
    enabled: canRead,
  });

  if (!canRead) return null;

  const contracts = data?.contracts ?? [];

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm dark:shadow-slate-950/20">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Contrats de maintenance
        </h2>
        <PermissionGate permission="contracts.create">
          <Link
            href={`/contracts/new?customerId=${customerId}`}
            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700"
          >
            Ajouter un contrat
          </Link>
        </PermissionGate>
      </div>
      {isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Chargement…</p>
      ) : contracts.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Aucun contrat pour ce client.</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {contracts.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <Link
                href={`/contracts/${c.id}`}
                className="font-medium text-brand-600 dark:text-brand-400 hover:underline"
              >
                {c.title}
              </Link>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                échéance {c.nextDueDate}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
