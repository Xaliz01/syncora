"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type {
  PlatformDashboardRecentLogin,
  PlatformDashboardResponse,
  PlatformDashboardVisit,
  PlatformOpsHealthResponse,
  PlatformServiceHealthSlot,
  PlatformServiceHealthStatus,
} from "@planwise/shared";
import * as platformApi from "@/lib/platform.api";
import { PlanwiseLoader } from "@/components/ui/PlanwiseLoader";

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

/** Date/heure compacte pour les listes denses du dashboard. */
function formatDateTimeCompact(iso: string) {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatCountryCode(code?: string): string {
  return code?.trim().toUpperCase() || "—";
}

function shortVisitorKey(key: string): string {
  const trimmed = key.trim();
  if (trimmed.length <= 10) return trimmed;
  return `${trimmed.slice(0, 8)}…`;
}

type KpiTone = "brand" | "sky" | "emerald" | "amber" | "violet" | "yellow" | "red";

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
  yellow: {
    card: "border-yellow-200/80 bg-gradient-to-br from-yellow-50 to-white dark:border-yellow-800/60 dark:from-yellow-950/40 dark:to-slate-900",
    label: "text-yellow-800 dark:text-yellow-300",
    value: "text-yellow-950 dark:text-yellow-100",
    hint: "text-yellow-700/70 dark:text-yellow-400/70",
    bar: "bg-yellow-500",
  },
  red: {
    card: "border-red-200/80 bg-gradient-to-br from-red-50 to-white dark:border-red-800/60 dark:from-red-950/40 dark:to-slate-900",
    label: "text-red-700 dark:text-red-300",
    value: "text-red-900 dark:text-red-100",
    hint: "text-red-600/70 dark:text-red-400/70",
    bar: "bg-red-500",
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
      className={`flex min-h-0 flex-col overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-slate-900 ${styles.wrap}`}
    >
      <div
        className={`flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2 text-xs font-medium ${styles.head}`}
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${styles.dot}`} aria-hidden />
          <span className="truncate">{title}</span>
        </span>
        <span className="shrink-0 tabular-nums text-[11px] opacity-70">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="px-3 py-4 text-xs text-slate-500">Aucune visite récente.</p>
      ) : (
        <div className="max-h-52 overflow-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="px-2.5 py-1.5 font-medium">Quand</th>
                <th className="px-2.5 py-1.5 font-medium">Pays</th>
                <th className="px-2.5 py-1.5 font-medium">Visiteur</th>
                <th className="px-2.5 py-1.5 font-medium">Referrer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((visit) => (
                <tr key={visit.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                  <td className="whitespace-nowrap px-2.5 py-1 tabular-nums text-slate-700 dark:text-slate-200">
                    {formatDateTimeCompact(visit.viewedAt)}
                  </td>
                  <td className="px-2.5 py-1 font-medium text-slate-600 dark:text-slate-300">
                    {formatCountryCode(visit.country)}
                  </td>
                  <td className="px-2.5 py-1">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className="font-mono text-[11px] text-slate-500"
                        title={visit.visitorKey}
                      >
                        {shortVisitorKey(visit.visitorKey)}
                      </span>
                      {visit.isReturningVisitor ? (
                        <span className="rounded bg-slate-100 px-1 py-px text-[9px] font-sans text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          Retour
                        </span>
                      ) : (
                        <span className="rounded bg-emerald-50 px-1 py-px text-[9px] font-sans text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          Nouveau
                        </span>
                      )}
                    </span>
                  </td>
                  <td
                    className="max-w-[7rem] truncate px-2.5 py-1 text-slate-500"
                    title={visit.referrerHost ?? undefined}
                  >
                    {visit.referrerHost ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RecentLoginsTable({ items }: { items: PlatformDashboardRecentLogin[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-emerald-200/70 bg-white shadow-sm dark:border-emerald-800/50 dark:bg-slate-900">
      <div className="flex items-center gap-2 border-b border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm font-medium text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
        <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
        10 dernières connexions
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-500">Aucune connexion récente.</p>
      ) : (
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">Connexion</th>
              <th className="px-4 py-2 font-medium">Utilisateur</th>
              <th className="px-4 py-2 font-medium">Organisation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((login) => (
              <tr
                key={`${login.userId}-${login.lastLoginAt}`}
                className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
              >
                <td className="whitespace-nowrap px-4 py-2 text-slate-700 dark:text-slate-200">
                  {formatDateTime(login.lastLoginAt)}
                </td>
                <td className="px-4 py-2">
                  <Link
                    href={`/platform/users?search=${encodeURIComponent(login.email)}`}
                    className="group block"
                  >
                    <p className="font-medium text-brand-600 group-hover:underline dark:text-brand-400">
                      {login.name?.trim() || login.email}
                    </p>
                    {login.name?.trim() ? (
                      <p className="text-xs text-slate-500 group-hover:text-brand-600/80 dark:group-hover:text-brand-400/80">
                        {login.email}
                      </p>
                    ) : null}
                  </Link>
                </td>
                <td className="px-4 py-2 text-slate-600 dark:text-slate-300">
                  {login.organizationId ? (
                    <Link
                      href={`/platform/organizations/${login.organizationId}`}
                      className="text-brand-600 hover:underline dark:text-brand-400"
                    >
                      {login.organizationName?.trim() || login.organizationId}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function statusBadgeClass(status: PlatformServiceHealthStatus): string {
  if (status === "up") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";
  }
  if (status === "down") {
    return "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300";
  }
  return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
}

function statusLabel(status: PlatformServiceHealthStatus): string {
  if (status === "up") return "UP";
  if (status === "down") return "DOWN";
  return "?";
}

function formatLatency(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 10) return `${ms.toFixed(1)} ms`;
  return `${Math.round(ms)} ms`;
}

function formatRate(rate: number | null): string {
  if (rate == null) return "—";
  return `${(rate * 100).toFixed(rate < 0.01 ? 2 : 1)} %`;
}

function averageNullable(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (nums.length === 0) return null;
  return nums.reduce((sum, v) => sum + v, 0) / nums.length;
}

function OpsMetricCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: KpiTone;
}) {
  const styles = KPI_TONES[tone];
  return (
    <div className={`relative overflow-hidden rounded-xl border p-4 shadow-sm ${styles.card}`}>
      <span className={`absolute inset-y-0 left-0 w-1 ${styles.bar}`} aria-hidden />
      <p className={`pl-2 text-xs font-medium uppercase tracking-wide ${styles.label}`}>{label}</p>
      <p className={`mt-1 pl-2 text-2xl font-semibold tabular-nums ${styles.value}`}>{value}</p>
      {hint ? <p className={`mt-1 pl-2 text-[11px] ${styles.hint}`}>{hint}</p> : null}
    </div>
  );
}

function formatPercent(value: number | null): string {
  if (value == null) return "—";
  return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)} %`;
}

function formatBytes(bytes: number | null): string {
  if (bytes == null || !Number.isFinite(bytes)) return "—";
  const gib = bytes / (1024 * 1024 * 1024);
  if (gib >= 10) return `${Math.round(gib)} Go`;
  if (gib >= 1) return `${gib.toFixed(1)} Go`;
  const mib = bytes / (1024 * 1024);
  if (mib >= 1) return `${Math.round(mib)} Mo`;
  const kib = bytes / 1024;
  return `${Math.round(kib)} Ko`;
}

function formatCpuCores(cores: number | null): string {
  if (cores == null) return "—";
  if (cores < 0.01) return `${Math.round(cores * 1000)} m`;
  return `${cores.toFixed(2)}`;
}

function formatRps(rps: number | null): string {
  if (rps == null) return "—";
  if (rps < 0.1) return rps.toFixed(2);
  if (rps < 10) return rps.toFixed(1);
  return `${Math.round(rps)}`;
}

function ServiceSlots({ slots }: { slots?: PlatformServiceHealthSlot[] }) {
  if (!slots || slots.length === 0) return null;
  return (
    <div className="mt-0.5 flex flex-wrap gap-1">
      {slots.map((slot) => (
        <span
          key={slot.slot}
          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${statusBadgeClass(slot.status)}`}
        >
          {slot.slot}: {statusLabel(slot.status)}
        </span>
      ))}
    </div>
  );
}

function OpsHealthDetailsTable({ data }: { data: PlatformOpsHealthResponse }) {
  return (
    <>
      {/* Mobile: stacked cards */}
      <ul className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
        {data.services.map((row) => (
          <li
            key={row.service}
            className="space-y-3 px-4 py-3.5 text-sm text-slate-800 dark:text-slate-200"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium">{row.label}</div>
                <ServiceSlots slots={row.slots} />
              </div>
              <span
                className={`shrink-0 inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(row.status)}`}
              >
                {statusLabel(row.status)}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Latence moy.</dt>
                <dd className="mt-0.5 tabular-nums text-slate-700 dark:text-slate-200">
                  {formatLatency(row.latencyMsAvg)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Latence p95</dt>
                <dd className="mt-0.5 tabular-nums text-slate-700 dark:text-slate-200">
                  {formatLatency(row.latencyMsP95)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Req/s</dt>
                <dd className="mt-0.5 tabular-nums text-slate-700 dark:text-slate-200">
                  {formatRps(row.requestsPerSecond)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">4xx</dt>
                <dd
                  className={`mt-0.5 tabular-nums ${
                    (row.errorRate4xx ?? 0) > 0.05
                      ? "text-amber-700 dark:text-amber-300"
                      : "text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {formatRate(row.errorRate4xx)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">5xx</dt>
                <dd
                  className={`mt-0.5 tabular-nums ${
                    (row.errorRate5xx ?? 0) > 0.01
                      ? "text-red-700 dark:text-red-300"
                      : "text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {formatRate(row.errorRate5xx)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">CPU</dt>
                <dd className="mt-0.5 tabular-nums text-slate-700 dark:text-slate-200">
                  {formatCpuCores(row.cpuCores)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">RAM</dt>
                <dd className="mt-0.5 tabular-nums text-slate-700 dark:text-slate-200">
                  {formatBytes(row.memoryBytes)}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto border-t border-slate-100 md:block dark:border-slate-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 dark:bg-slate-950 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">Service</th>
              <th className="px-4 py-2 font-medium">Statut</th>
              <th className="px-4 py-2 font-medium">Latence moy.</th>
              <th className="px-4 py-2 font-medium">Latence p95</th>
              <th className="px-4 py-2 font-medium">Req/s</th>
              <th className="px-4 py-2 font-medium">4xx</th>
              <th className="px-4 py-2 font-medium">5xx</th>
              <th className="px-4 py-2 font-medium">CPU</th>
              <th className="px-4 py-2 font-medium">RAM</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.services.map((row) => (
              <tr key={row.service} className="text-slate-800 dark:text-slate-200">
                <td className="px-4 py-2.5">
                  <div className="font-medium">{row.label}</div>
                  <ServiceSlots slots={row.slots} />
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(row.status)}`}
                  >
                    {statusLabel(row.status)}
                  </span>
                </td>
                <td className="px-4 py-2.5 tabular-nums text-slate-600 dark:text-slate-300">
                  {formatLatency(row.latencyMsAvg)}
                </td>
                <td className="px-4 py-2.5 tabular-nums text-slate-600 dark:text-slate-300">
                  {formatLatency(row.latencyMsP95)}
                </td>
                <td className="px-4 py-2.5 tabular-nums text-slate-600 dark:text-slate-300">
                  {formatRps(row.requestsPerSecond)}
                </td>
                <td
                  className={`px-4 py-2.5 tabular-nums ${
                    (row.errorRate4xx ?? 0) > 0.05
                      ? "text-amber-700 dark:text-amber-300"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {formatRate(row.errorRate4xx)}
                </td>
                <td
                  className={`px-4 py-2.5 tabular-nums ${
                    (row.errorRate5xx ?? 0) > 0.01
                      ? "text-red-700 dark:text-red-300"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {formatRate(row.errorRate5xx)}
                </td>
                <td className="px-4 py-2.5 tabular-nums text-slate-600 dark:text-slate-300">
                  {formatCpuCores(row.cpuCores)}
                </td>
                <td className="px-4 py-2.5 tabular-nums text-slate-600 dark:text-slate-300">
                  {formatBytes(row.memoryBytes)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function hostUsageTone(percent: number | null): KpiTone {
  if (percent == null) return "sky";
  if (percent >= 90) return "red";
  if (percent >= 75) return "amber";
  return "sky";
}

function OpsHealthSection({
  data,
  loading,
}: {
  data: PlatformOpsHealthResponse | null;
  loading: boolean;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  const avg4xx = data?.available ? averageNullable(data.services.map((s) => s.errorRate4xx)) : null;
  const avg5xx = data?.available ? averageNullable(data.services.map((s) => s.errorRate5xx)) : null;
  const latencyAvg = data?.available
    ? (data.summary.latencyMsAvg ?? averageNullable(data.services.map((s) => s.latencyMsAvg)))
    : null;
  const latencyP95 = data?.available
    ? (data.summary.latencyMsP95 ?? averageNullable(data.services.map((s) => s.latencyMsP95)))
    : null;

  const statusValue = !data?.available
    ? "—"
    : data.summary.downCount > 0
      ? `${data.summary.downCount} DOWN`
      : data.summary.unknownCount > 0 && data.summary.upCount === 0
        ? "?"
        : "UP";
  const statusHint = data?.available
    ? `${data.summary.upCount} up · ${data.summary.downCount} down${
        data.summary.unknownCount > 0 ? ` · ${data.summary.unknownCount} ?` : ""
      }`
    : undefined;
  const statusTone: KpiTone =
    !data?.available || data.summary.downCount > 0
      ? "amber"
      : data.summary.unknownCount > 0
        ? "sky"
        : "emerald";

  const cpuPercent = data?.available ? data.summary.cpuUsagePercent : null;
  const memoryPercent = data?.available ? data.summary.memoryUsagePercent : null;
  const memoryHint =
    data?.available && data.summary.memoryUsedBytes != null && data.summary.memoryTotalBytes != null
      ? `${formatBytes(data.summary.memoryUsedBytes)} / ${formatBytes(data.summary.memoryTotalBytes)}`
      : "Serveur";

  return (
    <section className="space-y-3">
      {loading && !data ? (
        <div className="flex justify-center rounded-xl border border-slate-200 bg-white py-10 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <PlanwiseLoader size="sm" label="Chargement…" />
        </div>
      ) : !data?.available ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          {data?.message ??
            "Métriques indisponibles. Vérifiez le profil monitoring et PROMETHEUS_URL."}
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <div className="min-w-0 flex-1 grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-7">
              <OpsMetricCard
                label="Statut"
                value={statusValue}
                hint={statusHint}
                tone={statusTone}
              />
              <OpsMetricCard
                label="Latence"
                value={formatLatency(latencyAvg)}
                hint={`p95 ${formatLatency(latencyP95)} · tous services`}
                tone="brand"
              />
              <OpsMetricCard
                label="Req/s"
                value={formatRps(data.summary.requestsPerSecond)}
                hint="Tous services"
                tone="sky"
              />
              <OpsMetricCard
                label="4xx"
                value={formatRate(avg4xx)}
                hint="Taux moyen"
                tone="yellow"
              />
              <OpsMetricCard label="5xx" value={formatRate(avg5xx)} hint="Taux moyen" tone="red" />
              <OpsMetricCard
                label="CPU"
                value={formatPercent(cpuPercent)}
                hint="Serveur"
                tone={hostUsageTone(cpuPercent)}
              />
              <OpsMetricCard
                label="RAM"
                value={formatPercent(memoryPercent)}
                hint={memoryHint}
                tone={hostUsageTone(memoryPercent)}
              />
            </div>

            <div className="flex shrink-0 justify-end sm:relative sm:w-9">
              <button
                type="button"
                onClick={() => setDetailsOpen((open) => !open)}
                title={detailsOpen ? "Masquer le détail" : "Voir le détail"}
                aria-label={detailsOpen ? "Masquer le détail" : "Voir le détail"}
                aria-expanded={detailsOpen}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white sm:absolute sm:inset-y-0 sm:right-0 sm:w-9 sm:flex-col sm:gap-1 sm:p-1.5"
              >
                {/* Table / list affordance */}
                <svg
                  className="h-4 w-4 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                  />
                </svg>
                <svg
                  className={`h-4 w-4 shrink-0 transition-transform ${detailsOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                  />
                </svg>
              </button>
            </div>
          </div>

          {detailsOpen ? (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <OpsHealthDetailsTable data={data} />
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

export function PlatformDashboardPage() {
  const [data, setData] = useState<PlatformDashboardResponse | null>(null);
  const [opsHealth, setOpsHealth] = useState<PlatformOpsHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [opsLoading, setOpsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setOpsLoading(true);
    platformApi
      .getPlatformDashboard()
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Erreur"))
      .finally(() => setLoading(false));

    platformApi
      .getPlatformOpsHealth()
      .then((res) => setOpsHealth(res))
      .catch(() =>
        setOpsHealth({
          available: false,
          source: "unavailable",
          window: "5m",
          fetchedAt: new Date().toISOString(),
          message: "Impossible de charger la santé des services.",
          services: [],
          summary: {
            upCount: 0,
            downCount: 0,
            unknownCount: 0,
            latencyMsAvg: null,
            latencyMsP95: null,
            requestsPerSecond: null,
            cpuUsagePercent: null,
            memoryUsagePercent: null,
            memoryUsedBytes: null,
            memoryTotalBytes: null,
          },
        }),
      )
      .finally(() => setOpsLoading(false));
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

      <OpsHealthSection data={opsHealth} loading={opsLoading} />

      {loading && !data ? (
        <div className="flex justify-center py-10">
          <PlanwiseLoader size="md" label="Chargement…" />
        </div>
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

          <RecentLoginsTable items={data.recentLogins ?? []} />

          <div className="grid gap-3 xl:grid-cols-3">
            <VisitsTable title="Landing `/`" items={data.recentLandingVisits} accent="brand" />
            <VisitsTable title="Login" items={data.recentLoginVisits} accent="sky" />
            <VisitsTable title="Register" items={data.recentRegisterVisits} accent="violet" />
          </div>
        </>
      ) : null}
    </div>
  );
}
