"use client";

import { useEffect, useState } from "react";
import type { CronRunResponse, PlatformCronJobsOverviewResponse } from "@planwise/shared";
import * as platformApi from "@/lib/platform.api";

function formatDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function formatDuration(ms?: number) {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function statusClass(status: string) {
  switch (status) {
    case "ok":
      return "text-emerald-700 dark:text-emerald-400";
    case "error":
      return "text-red-600 dark:text-red-400";
    case "skipped":
      return "text-amber-700 dark:text-amber-400";
    case "running":
      return "text-sky-700 dark:text-sky-400";
    default:
      return "text-slate-500";
  }
}

function formatStats(run?: CronRunResponse) {
  if (!run?.stats) return "—";
  const parts = Object.entries(run.stats)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}=${v}`);
  return parts.length ? parts.join(" · ") : "—";
}

export function PlatformCronsPage() {
  const [overview, setOverview] = useState<PlatformCronJobsOverviewResponse | null>(null);
  const [selectedJob, setSelectedJob] = useState<string>("");
  const [runs, setRuns] = useState<CronRunResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    platformApi
      .getPlatformCronJobs()
      .then((res) => {
        setOverview(res);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setHistoryLoading(true);
    platformApi
      .listPlatformCronRuns({
        jobKey: selectedJob || undefined,
        limit: 100,
      })
      .then((res) => setRuns(res.runs))
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur"))
      .finally(() => setHistoryLoading(false));
  }, [selectedJob]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Crons</h1>
        <p className="text-sm text-slate-500">Suivi des jobs planifiés (rétention ~90 jours).</p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {loading || !overview ? (
        <p className="text-sm text-slate-500">Chargement…</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {overview.jobs.map((job) => (
            <button
              key={job.jobKey}
              type="button"
              onClick={() => setSelectedJob(job.jobKey === selectedJob ? "" : job.jobKey)}
              className={`rounded-xl border p-4 text-left transition ${
                selectedJob === job.jobKey
                  ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                  : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900"
              }`}
            >
              <p className="text-sm font-semibold">{job.label}</p>
              <p
                className={`mt-1 text-xs ${
                  selectedJob === job.jobKey ? "opacity-80" : "text-slate-500"
                }`}
              >
                {job.schedule}
              </p>
              <p
                className={`mt-3 text-xs ${
                  selectedJob === job.jobKey ? "opacity-90" : statusClass(job.lastRun?.status ?? "")
                }`}
              >
                Dernier run : {job.lastRun ? formatDate(job.lastRun.startedAt) : "jamais"}
                {job.lastRun ? ` · ${job.lastRun.status}` : ""}
                {job.lastRun?.durationMs != null
                  ? ` · ${formatDuration(job.lastRun.durationMs)}`
                  : ""}
              </p>
            </button>
          ))}
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Historique {selectedJob ? `(${selectedJob})` : "(tous)"}
          </h2>
          {selectedJob ? (
            <button
              type="button"
              className="text-xs text-brand-600 hover:underline"
              onClick={() => setSelectedJob("")}
            >
              Voir tous
            </button>
          ) : null}
        </div>

        {historyLoading ? (
          <p className="text-sm text-slate-500">Chargement…</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-950">
                <tr>
                  <th className="px-4 py-3">Job</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Début</th>
                  <th className="px-4 py-3">Durée</th>
                  <th className="px-4 py-3">Stats</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {runs.map((run) => (
                  <tr key={run.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{run.jobKey}</p>
                      <p className="text-xs text-slate-500">{run.service}</p>
                      {run.errorMessage ? (
                        <p className="mt-1 text-xs text-red-600">{run.errorMessage}</p>
                      ) : null}
                    </td>
                    <td className={`px-4 py-3 font-medium ${statusClass(run.status)}`}>
                      {run.status}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatDate(run.startedAt)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatDuration(run.durationMs)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{formatStats(run)}</td>
                  </tr>
                ))}
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      Aucun run enregistré pour l’instant
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
