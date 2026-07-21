"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PlatformOrganizationDetailResponse, PlatformUserSummary } from "@planwise/shared";
import * as platformApi from "@/lib/platform.api";
import { useAuth } from "@/components/auth/AuthContext";
import { getAppOrigin, isLocalDevHost } from "@/lib/host-routing";

function formatDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export function PlatformOrganizationDetailPage({ organizationId }: { organizationId: string }) {
  const { enterImpersonationSession } = useAuth();
  const [data, setData] = useState<PlatformOrganizationDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reasonByUser, setReasonByUser] = useState<Record<string, string>>({});
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    platformApi
      .getPlatformOrganization(organizationId)
      .then((res) => {
        if (cancelled) return;
        setData(res);
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
  }, [organizationId]);

  const impersonate = async (user: PlatformUserSummary) => {
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
        organizationId,
        reason,
      });
      enterImpersonationSession(result.accessToken, result.user);
      const host = typeof window !== "undefined" ? window.location.hostname : "";
      window.location.href = isLocalDevHost(host) ? "/" : `${getAppOrigin()}/`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impersonation impossible");
      setImpersonatingId(null);
    }
  };

  if (loading) return <p className="text-sm text-slate-500">Chargement…</p>;
  if (!data) return <p className="text-sm text-red-600">{error ?? "Introuvable"}</p>;

  const org = data.organization;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/platform"
          className="text-sm text-brand-600 hover:underline dark:text-brand-400"
        >
          ← Organisations
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
          {org.name}
        </h1>
        <p className="text-sm text-slate-500">
          {[org.siret, org.email, org.city].filter(Boolean).join(" · ")}
        </p>
        {data.subscription ? (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Abonnement : {data.subscription.planName ?? "—"} · {data.subscription.status}
            {data.subscription.hasAccess ? " · accès actif" : " · sans accès"}
          </p>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Utilisateurs ({data.users.length})
        </h2>
        <ul className="space-y-3">
          {data.users.map((user) => (
            <li
              key={user.id}
              className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{user.name || user.email}</p>
                  <p className="text-sm text-slate-500">
                    {user.email}
                    {user.role ? ` · ${user.role}` : null}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Dernière connexion : {formatDate(user.lastLoginAt)}
                  </p>
                </div>
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
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
