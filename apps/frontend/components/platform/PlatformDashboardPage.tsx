"use client";

import { useEffect, useState } from "react";
import type { PlatformDashboardResponse, PlatformDashboardVisit } from "@planwise/shared";
import * as platformApi from "@/lib/platform.api";

function formatNumber(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

function formatDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short",
      timeStyle: "medium",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatCountry(code?: string): string {
  if (!code) return "—";
  try {
    const name = new Intl.DisplayNames(["fr"], { type: "region" }).of(code);
    return name ? `${name} (${code})` : code;
  } catch {
    return code;
  }
}

type KpiTone = "brand" | "sky" | "emerald" | "amber" | "violet";

const KPI_TONES: Record<
  KpiTone,
  {
    card: string;
    label: string;
    value: string;
    hint: string;
    bar: string;
  }
> = {
  brand: {
    card: "border-brand-200/80 bg-gradient-to-br from-brand-50 to-white dark:border-brand-800/60 dark:from-brand-950/50 dark:to-slate-900",
    label: "text-brand-700 dark:text-brand-300",
    value: "text-brand-900 dark:text-brand-100",
    hint: "text-brand-600/70 dark:text-brand-400/70",
    bar: "bg-brand-500",
  },
  sky: {
    card: "border-sky-200/80 bg-gradient-to-br from-sky-50 to-white dark:border-sky-800/60 dark:from-sky-950/40 dark:to-slate-900",
    label: "text-sky-700 dark:text-sky-300",
    value: "text-sky-900 dark:text-sky-100",
    hint: "text-sky-600/70 dark:text-sky-400/70",
    bar: "bg-sky-500",
  },
  emerald: {
    card: "border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white dark:border-emerald-800/60 dark:from-emerald-950/40 dark:to-slate-900",
    label: "text-emerald-700 dark:text-emerald-300",
    value: "text-emerald-900 dark:text-emerald-100",
    hint: "text-emerald-600/70 dark:text-emerald-400/70",
    bar: "bg-emerald-500",
  },
  amber: {
    card: "border-amber-200/80 bg-gradient-to-br from-amber-50 to-white dark:border-amber-800/60 dark:from-amber-950/40 dark:to-slate-900",
    label: "text-amber-800 dark:text-amber-300",
    value: "text-amber-950 dark:text-amber-100",
    hint: "text-amber-700/70 dark:text-amber-400/70",
    bar: "bg-amber-500",
  },
  violet: {
    card: "border-violet-200/80 bg-gradient-to-br from-violet-50 to-white dark:border-violet-800/60 dark:from-violet-950/40 dark:to-slate-900",
    label: "text-violet-700 dark:text-violet-300",
    value: "text-violet-900 dark:text-violet-100",
    hint: "text-violet-600/70 dark:text-violet-400/70",
    bar: "bg-violet-500",
  },
};

function KpiCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint?: string;
  tone: KpiTone;
}) {
  const styles = KPI_TONES[tone];
  return (
    <div className={`relative overflow-hidden rounded-xl border p-4 shadow-sm ${styles.card}`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${styles.bar}`} aria-hidden />
      <p className={`pl-2 text-xs font-medium uppercase tracking-wide ${styles.label}`}>{label}</p>
      <p className={`mt-1 pl-2 text-2xl font-semibold tabular-nums ${styles.value}`}>
        {formatNumber(value)}
      </p>
      {hint ? <p className={`mt-1 pl-2 text-[11px] ${styles.hint}`}>{hint}</p> : null}
    </div>
  );
}

type VisitAccent = "brand" | "sky" | "violet";

const VISIT_ACCENTS: Record<VisitAccent, { wrap: string; head: string; dot: string }> = {
  brand: {
    wrap: "border-brand-200/70 dark:border-brand-800/50",
    head: "border-brand-100 bg-brand-50/80 text-brand-900 dark:border-brand-900/50 dark:bg-brand-950/40 dark:text-brand-100",
    dot: "bg-brand-500",
  },
  sky: {
    wrap: "border-sky-200/70 dark:border-sky-800/50",
    head: "border-sky-100 bg-sky-50/80 text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-100",
    dot: "bg-sky-500",
  },
  violet: {
    wrap: "border-violet-200/70 dark:border-violet-800/50",
    head: "border-violet-100 bg-violet-50/80 text-violet-900 dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-100",
    dot: "bg-violet-500",
  },
};

function VisitsTable({
  title,
  items,
  accent,
}: {
  title: string;
  items: PlatformDashboardVisit[];
  accent: VisitAccent;
}) {
  const styles = VISIT_ACCENTS[accent];
  return (
    <div
      className={`overflow-x-auto rounded-xl border bg-white shadow-sm dark:bg-slate-900 ${styles.wrap}`}
    >
      <div
        className={`flex items-center gap-2 border-b px-4 py-3 text-sm font-medium ${styles.head}`}
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${styles.dot}`} aria-hidden />
        {title}
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-500">Aucune visite récente.</p>
      ) : (
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Pays</th>
              <th className="px-4 py-2 font-medium">Visiteur</th>
              <th className="px-4 py-2 font-medium">Referrer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((visit) => (
              <tr key={visit.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                <td className="whitespace-nowrap px-4 py-2 text-slate-700 dark:text-slate-200">
                  {formatDateTime(visit.viewedAt)}
                </td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                  {formatCountry(visit.country)}
                </td>
                <td className="px-4 py-2 font-mono text-xs text-slate-500">
                  {visit.visitorKey}
                  {visit.isReturningVisitor ? (
                    <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-sans text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      Retour
                    </span>
                  ) : (
                    <span className="ml-2 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-sans text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      Nouveau
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-500">{visit.referrerHost ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function PlatformDashboardPage() {
  const [data, setData] = useState<PlatformDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    platformApi
      .getPlatformDashboard()
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const id = window.setInterval(load, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Tableau de bord
          </h1>
          <p className="text-sm text-slate-500">
            Vue d’ensemble hors comptes de test (@benoistbabin.fr / @planwise.fr / @planwise.test).
            Actualisation automatique chaque minute.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          Actualiser
        </button>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {loading && !data ? (
        <p className="text-sm text-slate-500">Chargement…</p>
      ) : data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard
              label="Organisations"
              value={data.organizationCount}
              hint="Hors e-mails de test"
              tone="brand"
            />
            <KpiCard
              label="Utilisateurs"
              value={data.userCount}
              hint="Hors e-mails de test"
              tone="sky"
            />
            <KpiCard
              label="Connectés"
              value={data.connectedUserCount}
              hint="Activité ~15 min"
              tone="emerald"
            />
            <KpiCard label="Essais actifs" value={data.activeTrialCount} tone="amber" />
            <KpiCard
              label="Abonnés"
              value={data.subscriberCount}
              hint="active / past_due"
              tone="violet"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <VisitsTable
              title="10 dernières visites — Landing (`/`)"
              items={data.recentLandingVisits}
              accent="brand"
            />
            <VisitsTable
              title="10 dernières visites — Login"
              items={data.recentLoginVisits}
              accent="sky"
            />
            <VisitsTable
              title="10 dernières visites — Register"
              items={data.recentRegisterVisits}
              accent="violet"
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
