"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BASE_SUBSCRIPTION_PLAN,
  type PlatformOrganizationDetailResponse,
  type PlatformUserSummary,
} from "@planwise/shared";
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

export function PlatformOrganizationDetailPage({ organizationId }: { organizationId: string }) {
  const [data, setData] = useState<PlatformOrganizationDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reasonByUser, setReasonByUser] = useState<Record<string, string>>({});
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null);
  const [extendingTrial, setExtendingTrial] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
      window.location.href = buildSupportSessionHandoffUrl(result.accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impersonation impossible");
      setImpersonatingId(null);
    }
  };

  const extendTrial = async () => {
    setExtendingTrial(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const subscription = await platformApi.staffExtendOrganizationTrial(organizationId);
      setData((prev) => (prev ? { ...prev, subscription } : prev));
      setSuccessMessage(
        `Essai prolongé de ${BASE_SUBSCRIPTION_PLAN.trialDays} jours` +
          (subscription?.trialEndsAt ? ` — fin le ${formatDate(subscription.trialEndsAt)}` : "") +
          ".",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prolongation impossible");
    } finally {
      setExtendingTrial(false);
    }
  };

  if (loading) return <p className="text-sm text-slate-500">Chargement…</p>;
  if (!data) return <p className="text-sm text-red-600">{error ?? "Introuvable"}</p>;

  const org = data.organization;
  const sub = data.subscription;

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
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {successMessage ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">{successMessage}</p>
      ) : null}

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Abonnement</h2>
        {sub ? (
          <>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {sub.planName ?? "—"} · {sub.status}
              {sub.hasAccess ? " · accès actif" : " · sans accès"}
              {sub.billingOpen ? " · abonnements ouverts" : " · beta (paiement fermé)"}
            </p>
            <p className="text-sm text-slate-500">
              Fin d’essai : {formatDate(sub.trialEndsAt)}
              {" · "}
              Prolongations : {sub.trialExtensionCount ?? 0}/{sub.maxTrialExtensions ?? "—"}{" "}
              (self-service)
            </p>
            <button
              type="button"
              disabled={extendingTrial}
              onClick={() => void extendTrial()}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-60"
            >
              {extendingTrial
                ? "Prolongation…"
                : `Prolonger l’essai (+${BASE_SUBSCRIPTION_PLAN.trialDays} j)`}
            </button>
            <p className="text-xs text-slate-400">
              Action support : ignore le plafond self-service et fonctionne même si l’essai est
              encore actif. Impossible si un abonnement Stripe est déjà en cours.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-500">Aucun abonnement / essai enregistré.</p>
            <button
              type="button"
              disabled={extendingTrial}
              onClick={() => void extendTrial()}
              className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-60"
            >
              {extendingTrial
                ? "Activation…"
                : `Accorder un essai (+${BASE_SUBSCRIPTION_PLAN.trialDays} j)`}
            </button>
          </>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Intégrations</h2>
        {(data.integrations ?? []).length === 0 ? (
          <p className="text-sm text-slate-500">Aucune intégration connectée.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-700 dark:bg-slate-900">
            {(data.integrations ?? []).map((integration) => (
              <li
                key={`${integration.provider}-${integration.organizationId}`}
                className="px-4 py-3"
              >
                <p className="font-medium capitalize text-slate-900 dark:text-slate-100">
                  {integration.provider}
                </p>
                <p className="text-sm text-slate-500">
                  {[
                    integration.companyName,
                    integration.authMethod,
                    integration.tokenHint ? `token ${integration.tokenHint}` : null,
                    integration.connectedAt
                      ? `depuis ${formatDate(integration.connectedAt)}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

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
