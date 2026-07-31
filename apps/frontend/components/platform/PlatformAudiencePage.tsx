"use client";

import { useEffect, useState } from "react";
import type { PlatformAnalyticsOverviewResponse } from "@planwise/shared";
import * as platformApi from "@/lib/platform.api";

const DAY_OPTIONS = [7, 30, 90] as const;

const SURFACE_LABELS: Record<string, string> = {
  marketing: "Landing",
  app: "Application",
  platform: "Backoffice",
};

function formatNumber(n: number) {
  return new Intl.NumberFormat("fr-FR").format(n);
}

function formatCountry(code: string): string {
  try {
    const name = new Intl.DisplayNames(["fr"], { type: "region" }).of(code);
    return name ? `${name} (${code})` : code;
  } catch {
    return code;
  }
}

export function PlatformAudiencePage() {
  const [days, setDays] = useState<(typeof DAY_OPTIONS)[number]>(30);
  const [data, setData] = useState<PlatformAnalyticsOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    platformApi
      .getPlatformAnalyticsOverview(days)
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur"))
      .finally(() => setLoading(false));
  }, [days]);

  const maxDayViews = Math.max(1, ...(data?.byDay.map((d) => d.pageviews) ?? [1]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Audience</h1>
          <p className="text-sm text-slate-500">
            Mesure first-party (pages vues, pays approximatif via IP — IP non stockée, ~400 jours).
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-200 p-1 dark:border-slate-700">
          {DAY_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setDays(option)}
              className={`rounded-md px-3 py-1.5 text-sm ${
                days === option
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {option} j
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {loading || !data ? (
        <p className="text-sm text-slate-500">Chargement…</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Pages vues", value: data.totals.pageviews },
              { label: "Visiteurs", value: data.totals.visitors },
              { label: "Sessions", value: data.totals.sessions },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
              >
                <p className="text-xs uppercase tracking-wide text-slate-500">{stat.label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {formatNumber(stat.value)}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <h2 className="text-sm font-medium text-slate-900 dark:text-slate-100">Par jour</h2>
            <div className="mt-4 flex h-32 items-end gap-0.5">
              {data.byDay.map((day) => (
                <div
                  key={day.date}
                  className="flex min-w-0 flex-1 flex-col items-center justify-end"
                  title={`${day.date} · ${day.pageviews} vues · ${day.visitors} visiteurs`}
                >
                  <div
                    className="w-full rounded-t bg-brand-500/80 dark:bg-brand-400/70"
                    style={{
                      height: `${Math.max(2, (day.pageviews / maxDayViews) * 100)}%`,
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-slate-500">
              <span>{data.byDay[0]?.date}</span>
              <span>{data.byDay[data.byDay.length - 1]?.date}</span>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-4 py-3 text-sm font-medium dark:border-slate-800">
                Par surface
              </div>
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950">
                  <tr>
                    <th className="px-4 py-2">Surface</th>
                    <th className="px-4 py-2">Vues</th>
                    <th className="px-4 py-2">Visiteurs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.bySurface.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                        Aucune donnée
                      </td>
                    </tr>
                  ) : (
                    data.bySurface.map((row) => (
                      <tr key={row.surface}>
                        <td className="px-4 py-2">{SURFACE_LABELS[row.surface] ?? row.surface}</td>
                        <td className="px-4 py-2 tabular-nums">{formatNumber(row.pageviews)}</td>
                        <td className="px-4 py-2 tabular-nums">{formatNumber(row.visitors)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-4 py-3 text-sm font-medium dark:border-slate-800">
                Pages les plus vues
              </div>
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950">
                  <tr>
                    <th className="px-4 py-2">Chemin</th>
                    <th className="px-4 py-2">Vues</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.topPaths.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-4 py-6 text-center text-slate-500">
                        Aucune donnée
                      </td>
                    </tr>
                  ) : (
                    data.topPaths.map((row) => (
                      <tr key={row.path}>
                        <td className="px-4 py-2 font-mono text-xs">{row.path}</td>
                        <td className="px-4 py-2 tabular-nums">{formatNumber(row.pageviews)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <div className="border-b border-slate-100 px-4 py-3 text-sm font-medium dark:border-slate-800">
              Par pays
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950">
                <tr>
                  <th className="px-4 py-2">Pays</th>
                  <th className="px-4 py-2">Vues</th>
                  <th className="px-4 py-2">Visiteurs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(data.topCountries ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                      Aucune donnée
                    </td>
                  </tr>
                ) : (
                  data.topCountries.map((row) => (
                    <tr key={row.country}>
                      <td className="px-4 py-2">{formatCountry(row.country)}</td>
                      <td className="px-4 py-2 tabular-nums">{formatNumber(row.pageviews)}</td>
                      <td className="px-4 py-2 tabular-nums">{formatNumber(row.visitors)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
