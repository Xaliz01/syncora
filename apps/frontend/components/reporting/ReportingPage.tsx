"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as exportsApi from "@/lib/exports.api";
import { useAuth } from "@/components/auth/AuthContext";
import { hasPermission } from "@/lib/auth-permissions";
import type { ReportingStatsResponse } from "@syncora/shared";

type ExportFormat = "pdf" | "xlsx";

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</div>
      <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
        {value}
      </div>
      {sub && <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function ReportCard({
  title,
  description,
  icon,
  onExport,
  filters,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onExport: (format: ExportFormat, filters: Record<string, string>) => Promise<void>;
  filters?: React.ReactNode;
}) {
  const [loading, setLoading] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const handleExport = async (format: ExportFormat) => {
    setLoading(true);
    try {
      await onExport(format, filterValues);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
        </div>
      </div>

      {filters && (
        <div className="mt-3 flex flex-wrap gap-2">
          {React.Children.map(filters, (child) => {
            if (React.isValidElement(child)) {
              return React.cloneElement(
                child as React.ReactElement<{ onChange?: (v: string) => void }>,
                {
                  onChange: (v: string) => {
                    const name = (child.props as { name?: string }).name ?? "";
                    setFilterValues((prev) => ({ ...prev, [name]: v }));
                  },
                },
              );
            }
            return child;
          })}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => handleExport("xlsx")}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-50"
        >
          <svg
            className="h-3.5 w-3.5 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
            />
          </svg>
          Excel
        </button>
        <button
          type="button"
          onClick={() => handleExport("pdf")}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-50"
        >
          <svg
            className="h-3.5 w-3.5 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
          PDF
        </button>
      </div>
    </div>
  );
}

function DateRangeFilter({
  onStartChange,
  onEndChange,
}: {
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-2 w-full">
      <input
        type="date"
        onChange={(e) => onStartChange(e.target.value)}
        className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-700 dark:text-slate-200 w-full"
        placeholder="Du"
      />
      <input
        type="date"
        onChange={(e) => onEndChange(e.target.value)}
        className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-700 dark:text-slate-200 w-full"
        placeholder="Au"
      />
    </div>
  );
}

export function ReportingPage() {
  const { user } = useAuth();
  const canExportCases = hasPermission(user, "exports.cases");
  const canExportInterventions = hasPermission(user, "exports.interventions");
  const canExportReporting = hasPermission(user, "exports.reporting");
  const canExportCustomers = hasPermission(user, "exports.customers");
  const canExportUsers = hasPermission(user, "exports.users");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: stats } = useQuery<ReportingStatsResponse>({
    queryKey: ["reporting-stats"],
    queryFn: () => exportsApi.getReportingStats(),
    staleTime: 60_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-slate-100">
          Reporting
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Tableaux de bord et exports pour piloter votre activité.
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard
            label="Dossiers"
            value={stats.casesTotal}
            sub={`${stats.casesCompleted} terminés`}
          />
          <StatCard label="En cours" value={stats.casesInProgress} />
          <StatCard label="En retard" value={stats.casesOverdue} />
          <StatCard
            label="Interventions"
            value={stats.interventionsTotal}
            sub={`${stats.interventionsCompleted} terminées`}
          />
          <StatCard label="Techniciens actifs" value={stats.techniciansActive} />
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Période :</span>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200"
        />
        <span className="text-xs text-slate-400">→</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {canExportCases && (
          <ReportCard
            title="Liste des dossiers"
            description="Export complet des dossiers avec statut, priorité, client et avancement."
            icon={<FolderIcon />}
            onExport={(format) =>
              exportsApi.exportCasesList(format, {
                ...(startDate ? {} : {}),
              })
            }
          />
        )}

        {canExportInterventions && (
          <ReportCard
            title="Liste des interventions"
            description="Toutes les interventions avec technicien, équipe, durée et statut."
            icon={<CalendarIcon />}
            onExport={(format) =>
              exportsApi.exportInterventionsList(format, {
                startDate: startDate || undefined,
                endDate: endDate || undefined,
              })
            }
          />
        )}

        {canExportReporting && (
          <ReportCard
            title="Activité techniciens"
            description="Rapport d'activité par technicien : interventions, heures travaillées, taux de complétion."
            icon={<UsersIcon />}
            onExport={(format) =>
              exportsApi.exportTechniciansActivity(format, {
                startDate: startDate || undefined,
                endDate: endDate || undefined,
              })
            }
          />
        )}

        {canExportReporting && (
          <ReportCard
            title="Rapport kilométrique"
            description="Distance estimée, consommation de carburant, coût et empreinte CO₂ par équipe."
            icon={<TruckIcon />}
            onExport={(format) =>
              exportsApi.exportMileageReport(format, {
                startDate: startDate || undefined,
                endDate: endDate || undefined,
              })
            }
          />
        )}

        {canExportCustomers && (
          <ReportCard
            title="Liste des clients"
            description="Export des clients avec coordonnées, type et localisation."
            icon={<ContactIcon />}
            onExport={(format) => exportsApi.exportCustomersList(format)}
          />
        )}

        {canExportUsers && (
          <ReportCard
            title="Liste des utilisateurs"
            description="Export des utilisateurs avec rôle et statut."
            icon={<ShieldIcon />}
            onExport={(format) => exportsApi.exportUsersList(format)}
          />
        )}
      </div>
    </div>
  );
}

function FolderIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
      />
    </svg>
  );
}

function ContactIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    </svg>
  );
}
