"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import type { PlatformIntegrationSummary } from "@planwise/shared";
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

export function PlatformIntegrationsPage() {
  const [provider, setProvider] = useState("");
  const [activeProvider, setActiveProvider] = useState("");
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<PlatformIntegrationSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOffset(0);
  }, [activeProvider]);

  useEffect(() => {
    setLoading(true);
    platformApi
      .listPlatformIntegrations({
        provider: activeProvider || undefined,
        limit: LIST_PAGE_SIZE,
        offset,
      })
      .then((res) => {
        setItems(res.integrations);
        setTotal(res.total);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur"))
      .finally(() => setLoading(false));
  }, [activeProvider, offset]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setActiveProvider(provider.trim());
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Intégrations</h1>
          <p className="text-sm text-slate-500">{total} connexion(s)</p>
        </div>
        <form onSubmit={onSubmit} className="flex gap-2">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="">Tous les providers</option>
            <option value="qonto">Qonto</option>
            <option value="pennylane">Pennylane</option>
          </select>
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
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-950">
              <tr>
                <th className="px-4 py-3">Organisation</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Compte</th>
                <th className="px-4 py-3">Connecté le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((item) => (
                <tr key={`${item.organizationId}-${item.provider}`}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/platform/organizations/${item.organizationId}`}
                      className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                    >
                      {item.organizationName ?? item.organizationId}
                    </Link>
                  </td>
                  <td className="px-4 py-3 capitalize">{item.provider}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {[item.companyName, item.authMethod, item.tokenHint]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{formatDate(item.connectedAt)}</td>
                </tr>
              ))}
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    Aucune intégration
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          <div className="px-4 pb-3">
            <ListPagination
              offset={offset}
              limit={LIST_PAGE_SIZE}
              total={total}
              onOffsetChange={setOffset}
            />
          </div>
        </div>
      )}
    </div>
  );
}
