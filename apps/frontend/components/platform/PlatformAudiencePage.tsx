"use client";

import { useEffect, useState } from "react";
import type {
  PlatformAnalyticsOverviewResponse,
  PlatformLandingToAppVisitsResponse,
  PlatformLandingVisitsResponse,
} from "@planwise/shared";
import * as platformApi from "@/lib/platform.api";
import { ListPagination } from "@/components/ui/list-page";

const DAY_OPTIONS = [7, 30, 90] as const;
const VISITS_PAGE_LIMIT = 50;

const SURFACE_LABELS: Record<string, string> = {
  marketing: "Landing",
  app: "Application",
  platform: "Backoffice",
};

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

export function PlatformAudiencePage() {
  const [days, setDays] = useState<(typeof DAY_OPTIONS)[number]>(30);
  const [landingOffset, setLandingOffset] = useState(0);
  const [landingToAppOffset, setLandingToAppOffset] = useState(0);
  const [overview, setOverview] = useState<PlatformAnalyticsOverviewResponse | null>(null);
  const [landing, setLanding] = useState<PlatformLandingVisitsResponse | null>(null);
  const [landingToApp, setLandingToApp] = useState<PlatformLandingToAppVisitsResponse | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingLanding, setLoadingLanding] = useState(true);
  const [loadingLandingToApp, setLoadingLandingToApp] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLandingOffset(0);
    setLandingToAppOffset(0);
  }, [days]);

  useEffect(() => {
    setLoadingOverview(true);
    platformApi
      .getPlatformAnalyticsOverview(days)
      .then((res) => {
        setOverview(res);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur"))
      .finally(() => setLoadingOverview(false));
  }, [days]);

  useEffect(() => {
    setLoadingLanding(true);
    platformApi
      .getPlatformLandingVisits({ days, limit: VISITS_PAGE_LIMIT, offset: landingOffset })
      .then((res) => {
        setLanding(res);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur"))
      .finally(() => setLoadingLanding(false));
  }, [days, landingOffset]);

  useEffect(() => {
    setLoadingLandingToApp(true);
    platformApi
      .getPlatformLandingToAppVisits({
        days,
        limit: VISITS_PAGE_LIMIT,
        offset: landingToAppOffset,
      })
      .then((res) => {
        setLandingToApp(res);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur"))
      .finally(() => setLoadingLandingToApp(false));
  }, [days, landingToAppOffset]);

  const maxDayViews = Math.max(1, ...(overview?.byDay.map((d) => d.pageviews) ?? [1]));
  const loading =
    (loadingOverview && !overview) ||
    (loadingLanding && !landing) ||
    (loadingLandingToApp && !landingToApp);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Audience</h1>
          <p className="text-sm text-slate-500">
            Mesure first-party (pages vues, pays approximatif via IP — IP non stockée, ~400 jours),
            avec le détail landing et les passages landing → application.
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

      {loading ? (
        <p className="text-sm text-slate-500">Chargement…</p>
      ) : (
        <>
          {landing ? (
            <>
              <div>
                <h2 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Landing marketing (`/`)
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Chaque visite avec date/heure. Le code visiteur (stable navigateur) distingue les
                  visiteurs ; badge Nouveau / Retour sur la période.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Vues landing", value: landing.totals.pageviews },
                  { label: "Visiteurs landing", value: landing.totals.visitors },
                  { label: "Sessions landing", value: landing.totals.sessions },
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

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="border-b border-slate-100 px-4 py-3 text-sm font-medium dark:border-slate-800">
                  Visites landing (plus récentes d’abord)
                </div>
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Date / heure</th>
                      <th className="px-4 py-2.5 font-medium">Visiteur</th>
                      <th className="px-4 py-2.5 font-medium">Type</th>
                      <th className="px-4 py-2.5 font-medium">Session</th>
                      <th className="px-4 py-2.5 font-medium">Pays</th>
                      <th className="px-4 py-2.5 font-medium">Referrer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {landing.items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                          Aucune visite landing sur cette période.
                        </td>
                      </tr>
                    ) : (
                      landing.items.map((visit) => (
                        <tr
                          key={visit.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                        >
                          <td className="px-4 py-2.5 tabular-nums text-slate-800 dark:text-slate-100">
                            {formatDateTime(visit.viewedAt)}
                          </td>
                          <td className="px-4 py-2.5">
                            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-800">
                              {visit.visitorKey}
                            </code>
                          </td>
                          <td className="px-4 py-2.5">
                            {visit.isReturningVisitor ? (
                              <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                Retour
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                                Nouveau
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <code className="font-mono text-xs text-slate-500">
                              {visit.sessionKey}
                            </code>
                          </td>
                          <td className="px-4 py-2.5 text-slate-700 dark:text-slate-200">
                            {formatCountry(visit.country)}
                          </td>
                          <td className="px-4 py-2.5 text-slate-500">
                            {visit.referrerHost ?? "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <div className="px-4 py-1">
                  <ListPagination
                    total={landing.total}
                    limit={landing.limit}
                    offset={landing.offset}
                    onOffsetChange={setLandingOffset}
                  />
                </div>
              </div>
            </>
          ) : null}

          {landingToApp ? (
            <>
              <div>
                <h2 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Passage landing → application
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Pages vues sur l’app dont le referrer est la landing marketing (ex. planwise.fr →
                  app). Le chemin indique la page d’arrivée (souvent `/login`).
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Passages", value: landingToApp.totals.pageviews },
                  { label: "Visiteurs", value: landingToApp.totals.visitors },
                  { label: "Sessions", value: landingToApp.totals.sessions },
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

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="border-b border-slate-100 px-4 py-3 text-sm font-medium dark:border-slate-800">
                  Arrivées depuis la landing (plus récentes d’abord)
                </div>
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-2.5 font-medium">Date / heure</th>
                      <th className="px-4 py-2.5 font-medium">Chemin app</th>
                      <th className="px-4 py-2.5 font-medium">Visiteur</th>
                      <th className="px-4 py-2.5 font-medium">Type</th>
                      <th className="px-4 py-2.5 font-medium">Session</th>
                      <th className="px-4 py-2.5 font-medium">Pays</th>
                      <th className="px-4 py-2.5 font-medium">Referrer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {landingToApp.items.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                          Aucun passage landing → app sur cette période.
                        </td>
                      </tr>
                    ) : (
                      landingToApp.items.map((visit) => (
                        <tr
                          key={visit.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                        >
                          <td className="px-4 py-2.5 tabular-nums text-slate-800 dark:text-slate-100">
                            {formatDateTime(visit.viewedAt)}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-slate-700 dark:text-slate-200">
                            {visit.path}
                          </td>
                          <td className="px-4 py-2.5">
                            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs dark:bg-slate-800">
                              {visit.visitorKey}
                            </code>
                          </td>
                          <td className="px-4 py-2.5">
                            {visit.isReturningVisitor ? (
                              <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                Retour
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                                Nouveau
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <code className="font-mono text-xs text-slate-500">
                              {visit.sessionKey}
                            </code>
                          </td>
                          <td className="px-4 py-2.5 text-slate-700 dark:text-slate-200">
                            {formatCountry(visit.country)}
                          </td>
                          <td className="px-4 py-2.5 text-slate-500">
                            {visit.referrerHost ?? "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
                <div className="px-4 py-1">
                  <ListPagination
                    total={landingToApp.total}
                    limit={landingToApp.limit}
                    offset={landingToApp.offset}
                    onOffsetChange={setLandingToAppOffset}
                  />
                </div>
              </div>
            </>
          ) : null}

          {overview ? (
            <>
              <div>
                <h2 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Vue d’ensemble
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Toutes surfaces confondues (landing, application, backoffice).
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Pages vues", value: overview.totals.pageviews },
                  { label: "Visiteurs", value: overview.totals.visitors },
                  { label: "Sessions", value: overview.totals.sessions },
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
                  {overview.byDay.map((day) => (
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
                  <span>{overview.byDay[0]?.date}</span>
                  <span>{overview.byDay[overview.byDay.length - 1]?.date}</span>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
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
                      {overview.bySurface.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                            Aucune donnée
                          </td>
                        </tr>
                      ) : (
                        overview.bySurface.map((row) => (
                          <tr key={row.surface}>
                            <td className="px-4 py-2">
                              {SURFACE_LABELS[row.surface] ?? row.surface}
                            </td>
                            <td className="px-4 py-2 tabular-nums">
                              {formatNumber(row.pageviews)}
                            </td>
                            <td className="px-4 py-2 tabular-nums">{formatNumber(row.visitors)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
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
                      {overview.topPaths.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="px-4 py-6 text-center text-slate-500">
                            Aucune donnée
                          </td>
                        </tr>
                      ) : (
                        overview.topPaths.map((row) => (
                          <tr key={row.path}>
                            <td className="px-4 py-2 font-mono text-xs">{row.path}</td>
                            <td className="px-4 py-2 tabular-nums">
                              {formatNumber(row.pageviews)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
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
                    {(overview.topCountries ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                          Aucune donnée
                        </td>
                      </tr>
                    ) : (
                      overview.topCountries.map((row) => (
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
          ) : null}
        </>
      )}
    </div>
  );
}
