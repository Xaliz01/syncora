"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import type { PlatformOrganizationSummary } from "@planwise/shared";
import * as platformApi from "@/lib/platform.api";
import { ListPagination, LIST_PAGE_SIZE } from "@/components/ui/list-page";

function formatDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function PlatformOrganizationsPage() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [includeTestAccounts, setIncludeTestAccounts] = useState(false);
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<PlatformOrganizationSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOffset(0);
  }, [query, includeTestAccounts]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    platformApi
      .listPlatformOrganizations({
        search: query || undefined,
        includeTestAccounts: includeTestAccounts || undefined,
        limit: LIST_PAGE_SIZE,
        offset,
      })
      .then((res) => {
        if (cancelled) return;
        setItems(res.organizations);
        setTotal(res.total);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Erreur");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, offset, includeTestAccounts]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setQuery(search.trim());
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Organisations
          </h1>
          <p className="text-sm text-slate-500">{total} organisation(s)</p>
        </div>
        <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={includeTestAccounts}
              onChange={(e) => setIncludeTestAccounts(e.target.checked)}
              className="rounded border-slate-300"
            />
            Inclure les comptes de test
          </label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white dark:bg-slate-100 dark:text-slate-900"
          >
            Filtrer
          </button>
        </form>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? (
        <p className="text-sm text-slate-500">Chargement…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <ListPagination
            offset={offset}
            limit={LIST_PAGE_SIZE}
            total={total}
            onOffsetChange={setOffset}
          >
            <table className="min-w-[36rem] w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-950">
                <tr>
                  <th className="px-4 py-3">Organisation</th>
                  <th className="px-4 py-3">Users</th>
                  <th className="px-4 py-3">Dernière connexion</th>
                  <th className="px-4 py-3">Créée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/platform/organizations/${org.id}`}
                        className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                      >
                        {org.name}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {[org.siret, org.city].filter(Boolean).join(" · ") || org.id}
                      </p>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{org.userCount}</td>
                    <td className="px-4 py-3 tabular-nums">{formatDate(org.lastUserLoginAt)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatDate(org.createdAt)}</td>
                  </tr>
                ))}
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                      Aucune organisation
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </ListPagination>
        </div>
      )}
    </div>
  );
}
