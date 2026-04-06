"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import * as customersApi from "@/lib/customers.api";
import type { CustomerResponse } from "@syncora/shared";
import { CUSTOMER_KIND_LABELS } from "./customer-kind-labels";

export function CustomersListPage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const listEnabled = debounced.length === 0 || debounced.length >= 2;

  const { data: rows = [], isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["customers", "browse", debounced],
    queryFn: () => customersApi.listCustomers(debounced.length >= 2 ? debounced : undefined),
    enabled: listEnabled,
    staleTime: 20_000
  });

  const emptyMessage = useMemo(() => {
    if (debounced.length >= 2 && rows.length === 0) return "Aucun client ne correspond à cette recherche.";
    if (debounced.length === 0 && rows.length === 0) return "Aucun client pour le moment.";
    return null;
  }, [debounced.length, rows.length]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Clients</h1>
          <p className="mt-1 text-sm text-slate-600">
            Personnes physiques et morales réutilisables pour vos dossiers.
          </p>
        </div>
        <Link
          href="/customers/new"
          className="self-start rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-500"
        >
          Nouveau client
        </Link>
      </div>

      <div className="w-full sm:max-w-md">
        <input
          type="search"
          placeholder="Rechercher (min. 2 caractères)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {debounced.length === 1 && (
        <p className="text-sm text-slate-500">Saisissez au moins 2 caractères pour lancer la recherche.</p>
      )}

      {isError && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <span>{error instanceof Error ? error.message : "Impossible de charger les clients."}</span>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-lg border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-800 hover:bg-red-50"
          >
            Réessayer
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-slate-500">Chargement…</div>
        ) : emptyMessage ? (
          <div className="py-16 text-center text-sm text-slate-500">{emptyMessage}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Coordonnées</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c: CustomerResponse) => (
                  <tr
                    key={c.id}
                    className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-brand-50/40"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <Link
                        href={`/customers/${c.id}`}
                        className="block rounded-sm text-brand-700 hover:text-brand-600 hover:underline focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1"
                      >
                        {c.displayName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <Link href={`/customers/${c.id}`} className="block text-inherit hover:text-slate-800">
                        {CUSTOMER_KIND_LABELS[c.kind] ?? c.kind}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <Link href={`/customers/${c.id}`} className="block text-inherit hover:text-slate-800">
                        {[c.email, c.phone ?? c.mobile].filter(Boolean).join(" · ") || "—"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {isFetching && !isLoading && (
          <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">Mise à jour…</div>
        )}
      </div>
    </div>
  );
}
