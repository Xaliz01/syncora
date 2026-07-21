"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import type { PlatformUserSummary } from "@planwise/shared";
import * as platformApi from "@/lib/platform.api";
import { buildSupportSessionHandoffUrl } from "@/lib/support-session";

function formatDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function PlatformUsersPage() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<PlatformUserSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  const [reasonByUser, setReasonByUser] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    platformApi
      .listPlatformUsers({ search: query || undefined, limit: 100 })
      .then((res) => {
        if (cancelled) return;
        setItems(res.users);
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
  }, [query]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setQuery(search.trim());
  };

  const impersonate = async (user: PlatformUserSummary) => {
    if (!user.organizationId) {
      setError("Cet utilisateur n’a pas d’organisation active.");
      return;
    }
    const reason = (reasonByUser[user.id] ?? "").trim();
    if (reason.length < 10) {
      setError("Indiquez un motif support d’au moins 10 caractères.");
      return;
    }
    setImpersonatingId(user.id);
    setError(null);
    try {
      const result = await platformApi.startImpersonation({
        userId: user.id,
        organizationId: user.organizationId,
        reason,
      });
      // Ne pas écrire le JWT sur l’origine backoffice : handoff vers app.*
      window.location.href = buildSupportSessionHandoffUrl(result.accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impersonation impossible");
      setImpersonatingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Utilisateurs</h1>
          <p className="text-sm text-slate-500">{total} utilisateur(s)</p>
        </div>
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Email ou nom…"
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
        <ul className="space-y-3">
          {items.map((user) => (
            <li
              key={user.id}
              className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {user.name || user.email}
                  </p>
                  <p className="text-sm text-slate-500">
                    {user.email}
                    {user.organizationName ? (
                      <>
                        {" · "}
                        <Link
                          href={`/platform/organizations/${user.organizationId}`}
                          className="text-brand-600 hover:underline dark:text-brand-400"
                        >
                          {user.organizationName}
                        </Link>
                      </>
                    ) : null}
                    {user.role ? ` · ${user.role}` : null}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Dernière connexion : {formatDate(user.lastLoginAt)}
                  </p>
                </div>
                {user.organizationId ? (
                  <div className="flex w-full max-w-md flex-col gap-2 sm:items-end">
                    <input
                      value={reasonByUser[user.id] ?? ""}
                      onChange={(e) =>
                        setReasonByUser((prev) => ({ ...prev, [user.id]: e.target.value }))
                      }
                      placeholder="Motif support (ticket…)"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                    />
                    <button
                      type="button"
                      disabled={impersonatingId === user.id}
                      onClick={() => void impersonate(user)}
                      className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
                    >
                      {impersonatingId === user.id ? "Ouverture…" : "Se connecter en support"}
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
          {items.length === 0 ? (
            <li className="py-8 text-center text-sm text-slate-500">Aucun utilisateur</li>
          ) : null}
        </ul>
      )}
    </div>
  );
}
