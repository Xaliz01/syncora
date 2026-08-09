"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type {
  BillingStatus,
  CaseInvoiceKind,
  CasePriority,
  CaseStatus,
  ExportFormat,
  InterventionStatus,
  PermissionCode,
  RemoteInvoiceLifecycle,
  ReportPreviewQuery,
  ReportPreviewType,
} from "@planwise/shared";
import {
  BILLING_STATUS_LABELS,
  CASE_INVOICE_KIND_LABELS,
  defaultReportingPeriod,
  getReportingPeriodError,
  isReportEntityRef,
  isReportPreviewType,
  MAX_PAGE_LIMIT,
  REMOTE_INVOICE_STATUS_LABELS,
} from "@planwise/shared";
import * as exportsApi from "@/lib/exports.api";
import * as fleetApi from "@/lib/fleet.api";
import * as casesApi from "@/lib/cases.api";
import * as customersApi from "@/lib/customers.api";
import * as orderGiversApi from "@/lib/order-givers.api";
import { EntityRef } from "@/components/ui/EntityRef";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { BillingIntegrationConnectBanner } from "@/components/billing/BillingIntegrationConnectBanner";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/components/auth/AuthContext";
import { hasPermission } from "@/lib/auth-permissions";
import { useBillingIntegrationAvailability } from "@/lib/hooks/useBillingIntegrationAvailability";

const REPORT_META: Record<
  ReportPreviewType,
  { title: string; needsPeriod: boolean; permission: PermissionCode }
> = {
  cases_list: { title: "Liste des dossiers", needsPeriod: true, permission: "exports.cases" },
  interventions_list: {
    title: "Liste des interventions",
    needsPeriod: true,
    permission: "exports.interventions",
  },
  technicians_activity: {
    title: "Activité techniciens",
    needsPeriod: true,
    permission: "exports.reporting",
  },
  mileage_report: {
    title: "Rapport kilométrique",
    needsPeriod: true,
    permission: "exports.reporting",
  },
  customers_list: {
    title: "Liste des clients",
    needsPeriod: false,
    permission: "exports.customers",
  },
  users_list: { title: "Liste des utilisateurs", needsPeriod: false, permission: "exports.users" },
  invoices_list: { title: "Liste des factures", needsPeriod: true, permission: "exports.billing" },
};

const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  draft: "Brouillon",
  open: "Ouvert",
  in_progress: "En cours",
  waiting: "En attente",
  completed: "Terminé",
  cancelled: "Annulé",
};

const CASE_PRIORITY_LABELS: Record<CasePriority, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  urgent: "Urgente",
};

const INTERVENTION_STATUS_LABELS: Record<InterventionStatus, string> = {
  planned: "Planifiée",
  in_progress: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
};

const FILTER_INPUT_CLASS =
  "rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-200";

const URL_FILTER_KEYS = [
  "startDate",
  "endDate",
  "status",
  "billingStatus",
  "priority",
  "search",
  "teamId",
  "assigneeId",
  "technicianId",
  "remoteStatus",
  "provider",
  "invoiceKind",
  "customerId",
  "orderGiverId",
  "groupBy",
  "typeId",
] as const;

function ExportFormatButtons({
  disabled,
  loading,
  onExport,
}: {
  disabled?: boolean;
  loading?: boolean;
  onExport: (format: ExportFormat) => void;
}) {
  const formats: {
    format: ExportFormat;
    label: string;
    icon: React.ReactNode;
    className: string;
  }[] = [
    {
      format: "xlsx",
      label: "Excel",
      icon: <SpreadsheetIcon />,
      className:
        "border-emerald-200/80 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-950/70",
    },
    {
      format: "csv",
      label: "CSV",
      icon: <CsvIcon />,
      className:
        "border-sky-200/80 bg-sky-50 text-sky-800 hover:bg-sky-100 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-200 dark:hover:bg-sky-950/70",
    },
    {
      format: "pdf",
      label: "PDF",
      icon: <PdfIcon />,
      className:
        "border-rose-200/80 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950/70",
    },
  ];

  return (
    <div
      className="inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/60 p-1.5 shadow-sm"
      role="group"
      aria-label="Exporter le rapport"
    >
      <span className="hidden sm:inline px-2 text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {loading ? "Export…" : "Exporter"}
      </span>
      {formats.map(({ format, label, icon, className }) => (
        <button
          key={format}
          type="button"
          disabled={disabled || loading}
          onClick={() => onExport(format)}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        >
          {icon}
          {label}
        </button>
      ))}
    </div>
  );
}

function SpreadsheetIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0"
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
  );
}

function CsvIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0"
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
  );
}

type FilterState = {
  startDate: string;
  endDate: string;
  status: string;
  billingStatus: string;
  priority: string;
  search: string;
  teamId: string;
  assigneeId: string;
  technicianId: string;
  remoteStatus: string;
  provider: string;
  invoiceKind: string;
  customerId: string;
  orderGiverId: string;
  groupBy: "team" | "technician";
  typeId: string;
};

function readInitialFilters(
  searchParams: URLSearchParams,
  defaults: { startDate: string; endDate: string },
): FilterState {
  const groupByRaw = searchParams.get("groupBy");
  return {
    startDate: searchParams.get("startDate") || defaults.startDate,
    endDate: searchParams.get("endDate") || defaults.endDate,
    status: searchParams.get("status") ?? "",
    billingStatus: searchParams.get("billingStatus") ?? "",
    priority: searchParams.get("priority") ?? "",
    search: searchParams.get("search") ?? "",
    teamId: searchParams.get("teamId") ?? "",
    assigneeId: searchParams.get("assigneeId") ?? "",
    technicianId: searchParams.get("technicianId") ?? "",
    remoteStatus: searchParams.get("remoteStatus") ?? "",
    provider: searchParams.get("provider") ?? "",
    invoiceKind: searchParams.get("invoiceKind") ?? "",
    customerId: searchParams.get("customerId") ?? "",
    orderGiverId: searchParams.get("orderGiverId") ?? "",
    groupBy: groupByRaw === "technician" ? "technician" : "team",
    typeId: searchParams.get("typeId") ?? "",
  };
}

function buildPreviewFilters(
  reportType: ReportPreviewType,
  state: FilterState,
  needsPeriod: boolean,
): ReportPreviewQuery {
  const q: ReportPreviewQuery = {};
  if (needsPeriod) {
    if (state.startDate) q.startDate = state.startDate;
    if (state.endDate) q.endDate = state.endDate;
  }

  switch (reportType) {
    case "cases_list":
      if (state.status) q.status = state.status;
      if (state.billingStatus) q.billingStatus = state.billingStatus;
      if (state.priority) q.priority = state.priority;
      if (state.search.trim()) q.search = state.search.trim();
      if (state.orderGiverId) q.orderGiverId = state.orderGiverId;
      break;
    case "interventions_list":
      if (state.status) q.status = state.status;
      if (state.teamId) q.teamId = state.teamId;
      if (state.assigneeId) q.assigneeId = state.assigneeId;
      if (state.typeId) q.typeId = state.typeId;
      break;
    case "technicians_activity":
      if (state.technicianId) q.technicianId = state.technicianId;
      break;
    case "mileage_report":
      q.groupBy = state.groupBy;
      if (state.groupBy === "technician") {
        if (state.technicianId) q.technicianId = state.technicianId;
      } else if (state.teamId) {
        q.teamId = state.teamId;
      }
      break;
    case "invoices_list":
      if (state.remoteStatus) q.remoteStatus = state.remoteStatus;
      if (state.provider) q.provider = state.provider;
      if (state.invoiceKind) q.invoiceKind = state.invoiceKind;
      if (state.customerId) q.customerId = state.customerId;
      if (state.orderGiverId) q.orderGiverId = state.orderGiverId;
      break;
    default:
      break;
  }

  return q;
}

function syncFiltersToUrl(reportType: ReportPreviewType, state: FilterState, needsPeriod: boolean) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  for (const key of URL_FILTER_KEYS) {
    params.delete(key);
  }

  const active = buildPreviewFilters(reportType, state, needsPeriod);
  for (const [key, value] of Object.entries(active)) {
    if (value) params.set(key, value);
  }

  const qs = params.toString();
  window.history.replaceState(null, "", `/reporting/${reportType}${qs ? `?${qs}` : ""}`);
}

export function ReportResultPage() {
  const params = useParams<{ reportType: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [exporting, setExporting] = useState(false);

  const reportType = params.reportType ?? "";
  const validType = isReportPreviewType(reportType) ? reportType : null;
  const meta = validType ? REPORT_META[validType] : null;

  const defaults = useMemo(() => defaultReportingPeriod(), []);
  const [filtersState, setFiltersState] = useState<FilterState>(() =>
    readInitialFilters(searchParams, defaults),
  );

  const periodError = meta?.needsPeriod
    ? getReportingPeriodError(filtersState.startDate, filtersState.endDate)
    : null;
  const periodValid = !meta?.needsPeriod || !periodError;

  const canAccess = meta ? hasPermission(user, meta.permission) : false;

  const { data: billingAvailability, isLoading: billingAvailabilityLoading } =
    useBillingIntegrationAvailability();
  const showBillingConnectBanner =
    validType === "invoices_list" &&
    !billingAvailabilityLoading &&
    billingAvailability?.connected !== true;

  const needsTeams =
    validType === "interventions_list" ||
    (validType === "mileage_report" && filtersState.groupBy === "team");
  const needsTechnicians =
    validType === "interventions_list" ||
    validType === "technicians_activity" ||
    (validType === "mileage_report" && filtersState.groupBy === "technician");
  const needsOrderGivers = validType === "cases_list" || validType === "invoices_list";
  const needsCustomers = validType === "invoices_list";

  const { data: teams = [] } = useQuery({
    queryKey: ["fleet-teams"],
    queryFn: () => fleetApi.listTeams(),
    enabled: Boolean(validType && canAccess && needsTeams),
  });

  const { data: technicians = [] } = useQuery({
    queryKey: ["fleet-technicians"],
    queryFn: () => fleetApi.listTechnicians(),
    enabled: Boolean(validType && canAccess && needsTechnicians),
  });

  const { data: interventionTypesData } = useQuery({
    queryKey: ["intervention-types", "report-filter"],
    queryFn: () => casesApi.listInterventionTypes(),
    enabled: Boolean(
      validType === "interventions_list" &&
      canAccess &&
      hasPermission(user, "intervention_types.read"),
    ),
  });
  const interventionTypes = interventionTypesData?.types ?? [];

  const { data: orderGiversData } = useQuery({
    queryKey: ["order-givers", "report-filter"],
    queryFn: () => orderGiversApi.listOrderGivers({ limit: MAX_PAGE_LIMIT }),
    enabled: Boolean(
      validType && canAccess && needsOrderGivers && hasPermission(user, "order_givers.read"),
    ),
  });
  const orderGivers = orderGiversData?.orderGivers ?? [];

  const { data: customersData } = useQuery({
    queryKey: ["customers", "report-filter"],
    queryFn: () => customersApi.listCustomers({ limit: MAX_PAGE_LIMIT }),
    enabled: Boolean(
      validType && canAccess && needsCustomers && hasPermission(user, "customers.read"),
    ),
  });
  const customers = customersData?.customers ?? [];

  useEffect(() => {
    if (!validType || !meta) return;
    syncFiltersToUrl(validType, filtersState, meta.needsPeriod);
  }, [validType, meta, filtersState]);

  const patchFilters = (patch: Partial<FilterState>) => {
    setFiltersState((prev) => ({ ...prev, ...patch }));
  };

  const previewFilters = useMemo(
    () => (validType && meta ? buildPreviewFilters(validType, filtersState, meta.needsPeriod) : {}),
    [validType, meta, filtersState],
  );

  const {
    data: preview,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["report-preview", validType, previewFilters],
    queryFn: () => exportsApi.getReportPreview(validType!, previewFilters),
    enabled: Boolean(validType && canAccess && periodValid),
    placeholderData: keepPreviousData,
  });

  const showTableLoading = periodValid && isFetching;
  const showFilterBar =
    Boolean(meta?.needsPeriod) ||
    validType === "cases_list" ||
    validType === "interventions_list" ||
    validType === "technicians_activity" ||
    validType === "mileage_report" ||
    validType === "invoices_list";

  const runExport = async (format: ExportFormat) => {
    if (!validType || !periodValid) return;
    setExporting(true);
    try {
      switch (validType) {
        case "cases_list":
          await exportsApi.exportCasesList(format, {
            startDate: previewFilters.startDate,
            endDate: previewFilters.endDate,
            status: previewFilters.status,
            billingStatus: previewFilters.billingStatus,
            priority: previewFilters.priority,
            search: previewFilters.search,
            orderGiverId: previewFilters.orderGiverId,
          });
          break;
        case "interventions_list":
          await exportsApi.exportInterventionsList(format, {
            startDate: previewFilters.startDate,
            endDate: previewFilters.endDate,
            status: previewFilters.status,
            teamId: previewFilters.teamId,
            assigneeId: previewFilters.assigneeId,
            typeId: previewFilters.typeId,
          });
          break;
        case "technicians_activity":
          await exportsApi.exportTechniciansActivity(format, {
            startDate: previewFilters.startDate,
            endDate: previewFilters.endDate,
            technicianId: previewFilters.technicianId,
          });
          break;
        case "mileage_report":
          await exportsApi.exportMileageReport(format, {
            startDate: previewFilters.startDate,
            endDate: previewFilters.endDate,
            teamId: previewFilters.teamId,
            technicianId: previewFilters.technicianId,
            groupBy: previewFilters.groupBy,
          });
          break;
        case "customers_list":
          await exportsApi.exportCustomersList(format);
          break;
        case "users_list":
          await exportsApi.exportUsersList(format);
          break;
        case "invoices_list":
          await exportsApi.exportInvoicesList(format, {
            startDate: previewFilters.startDate,
            endDate: previewFilters.endDate,
            remoteStatus: previewFilters.remoteStatus,
            provider: previewFilters.provider,
            invoiceKind: previewFilters.invoiceKind,
            customerId: previewFilters.customerId,
            orderGiverId: previewFilters.orderGiverId,
          });
          break;
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Export impossible", "error");
    } finally {
      setExporting(false);
    }
  };

  if (!validType || !meta) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">Rapport inconnu.</p>
        <Link href="/reporting" className="text-sm text-brand-600 hover:underline">
          Retour au reporting
        </Link>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Vous n&apos;avez pas la permission d&apos;accéder à ce rapport.
        </p>
        <Link href="/reporting" className="text-sm text-brand-600 hover:underline">
          Retour au reporting
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => router.push("/reporting")}
            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-2"
          >
            ← Reporting
          </button>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-800 dark:text-slate-100">
            {meta.title}
          </h1>
          {periodValid && preview && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {showTableLoading
                ? "Mise à jour…"
                : `${preview.total} ligne${preview.total > 1 ? "s" : ""}`}
            </p>
          )}
        </div>
        <ExportFormatButtons
          disabled={!periodValid || showTableLoading}
          loading={exporting}
          onExport={(f) => void runExport(f)}
        />
      </div>

      {showBillingConnectBanner ? <BillingIntegrationConnectBanner /> : null}

      {showFilterBar && (
        <div className="flex flex-wrap gap-2 items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 shadow-sm">
          {meta.needsPeriod && (
            <>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Période :
              </span>
              <input
                type="date"
                required
                value={filtersState.startDate}
                onChange={(e) => patchFilters({ startDate: e.target.value })}
                className={FILTER_INPUT_CLASS}
                aria-label="Date de début"
              />
              <span className="text-xs text-slate-400">→</span>
              <input
                type="date"
                required
                value={filtersState.endDate}
                onChange={(e) => patchFilters({ endDate: e.target.value })}
                className={FILTER_INPUT_CLASS}
                aria-label="Date de fin"
              />
            </>
          )}

          {validType === "cases_list" && (
            <>
              <input
                type="search"
                value={filtersState.search}
                onChange={(e) => patchFilters({ search: e.target.value })}
                placeholder="Rechercher…"
                className={`${FILTER_INPUT_CLASS} min-w-[10rem] flex-1 sm:flex-none`}
                aria-label="Rechercher un dossier"
              />
              <select
                value={filtersState.status}
                onChange={(e) => patchFilters({ status: e.target.value })}
                className={FILTER_INPUT_CLASS}
                aria-label="Statut dossier"
              >
                <option value="">Tous les statuts</option>
                {(Object.keys(CASE_STATUS_LABELS) as CaseStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {CASE_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <select
                value={filtersState.billingStatus}
                onChange={(e) => patchFilters({ billingStatus: e.target.value })}
                className={FILTER_INPUT_CLASS}
                aria-label="Statut facturation"
              >
                <option value="">Facturation</option>
                {(Object.entries(BILLING_STATUS_LABELS) as [BillingStatus, string][])
                  .filter(([v]) => v !== "none")
                  .map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
              </select>
              <select
                value={filtersState.priority}
                onChange={(e) => patchFilters({ priority: e.target.value })}
                className={FILTER_INPUT_CLASS}
                aria-label="Priorité"
              >
                <option value="">Toutes les priorités</option>
                {(Object.keys(CASE_PRIORITY_LABELS) as CasePriority[]).map((p) => (
                  <option key={p} value={p}>
                    {CASE_PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
              {orderGivers.length > 0 ? (
                <select
                  value={filtersState.orderGiverId}
                  onChange={(e) => patchFilters({ orderGiverId: e.target.value })}
                  className={FILTER_INPUT_CLASS}
                  aria-label="Donneur d'ordre"
                >
                  <option value="">Tous les donneurs d&apos;ordre</option>
                  {orderGivers.map((og) => (
                    <option key={og.id} value={og.id}>
                      {og.displayName}
                    </option>
                  ))}
                </select>
              ) : null}
            </>
          )}

          {validType === "interventions_list" && (
            <>
              <select
                value={filtersState.typeId}
                onChange={(e) => patchFilters({ typeId: e.target.value })}
                className={FILTER_INPUT_CLASS}
                aria-label="Type d’intervention"
              >
                <option value="">Tous les types</option>
                {interventionTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              <select
                value={filtersState.status}
                onChange={(e) => patchFilters({ status: e.target.value })}
                className={FILTER_INPUT_CLASS}
                aria-label="Statut intervention"
              >
                <option value="">Tous les statuts</option>
                {(Object.keys(INTERVENTION_STATUS_LABELS) as InterventionStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {INTERVENTION_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              <select
                value={filtersState.teamId}
                onChange={(e) => patchFilters({ teamId: e.target.value })}
                className={FILTER_INPUT_CLASS}
                aria-label="Équipe"
              >
                <option value="">Toutes les équipes</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              <select
                value={filtersState.assigneeId}
                onChange={(e) => patchFilters({ assigneeId: e.target.value })}
                className={FILTER_INPUT_CLASS}
                aria-label="Technicien"
              >
                <option value="">Tous les techniciens</option>
                {technicians.map((tech) => {
                  return (
                    <option key={tech.id} value={tech.id}>
                      {tech.firstName} {tech.lastName}
                    </option>
                  );
                })}
              </select>
            </>
          )}

          {validType === "technicians_activity" && (
            <select
              value={filtersState.technicianId}
              onChange={(e) => patchFilters({ technicianId: e.target.value })}
              className={FILTER_INPUT_CLASS}
              aria-label="Technicien"
            >
              <option value="">Tous les techniciens</option>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.firstName} {tech.lastName}
                </option>
              ))}
            </select>
          )}

          {validType === "mileage_report" && (
            <>
              <select
                value={filtersState.groupBy}
                onChange={(e) =>
                  patchFilters({
                    groupBy: e.target.value === "technician" ? "technician" : "team",
                    teamId: "",
                    technicianId: "",
                  })
                }
                className={FILTER_INPUT_CLASS}
                aria-label="Regrouper par"
              >
                <option value="team">Par équipe</option>
                <option value="technician">Par technicien</option>
              </select>
              {filtersState.groupBy === "technician" ? (
                <select
                  value={filtersState.technicianId}
                  onChange={(e) => patchFilters({ technicianId: e.target.value })}
                  className={FILTER_INPUT_CLASS}
                  aria-label="Technicien"
                >
                  <option value="">Tous les techniciens</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.firstName} {tech.lastName}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={filtersState.teamId}
                  onChange={(e) => patchFilters({ teamId: e.target.value })}
                  className={FILTER_INPUT_CLASS}
                  aria-label="Équipe"
                >
                  <option value="">Toutes les équipes</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              )}
            </>
          )}

          {validType === "invoices_list" && (
            <>
              <select
                value={filtersState.remoteStatus}
                onChange={(e) => patchFilters({ remoteStatus: e.target.value })}
                className={FILTER_INPUT_CLASS}
                aria-label="Statut facture"
              >
                <option value="">Tous statuts</option>
                {(Object.keys(REMOTE_INVOICE_STATUS_LABELS) as RemoteInvoiceLifecycle[]).map(
                  (key) => (
                    <option key={key} value={key}>
                      {REMOTE_INVOICE_STATUS_LABELS[key]}
                    </option>
                  ),
                )}
              </select>
              <select
                value={filtersState.provider}
                onChange={(e) => patchFilters({ provider: e.target.value })}
                className={FILTER_INPUT_CLASS}
                aria-label="Fournisseur"
              >
                <option value="">Tous fournisseurs</option>
                <option value="pennylane">Pennylane</option>
                <option value="qonto">Qonto</option>
              </select>
              <select
                value={filtersState.invoiceKind}
                onChange={(e) => patchFilters({ invoiceKind: e.target.value })}
                className={FILTER_INPUT_CLASS}
                aria-label="Type de facture"
              >
                <option value="">Tous types</option>
                {(Object.keys(CASE_INVOICE_KIND_LABELS) as CaseInvoiceKind[]).map((key) => (
                  <option key={key} value={key}>
                    {CASE_INVOICE_KIND_LABELS[key]}
                  </option>
                ))}
              </select>
              {customers.length > 0 ? (
                <SearchableSelect
                  value={filtersState.customerId}
                  onChange={(next) =>
                    patchFilters({
                      customerId: next,
                      orderGiverId: next ? "" : filtersState.orderGiverId,
                    })
                  }
                  options={customers.map((c) => ({ value: c.id, label: c.displayName }))}
                  emptyLabel="Tous les clients"
                  placeholder="Rechercher un client…"
                  aria-label="Client"
                />
              ) : null}
              {orderGivers.length > 0 ? (
                <select
                  value={filtersState.orderGiverId}
                  onChange={(e) =>
                    patchFilters({
                      orderGiverId: e.target.value,
                      customerId: e.target.value ? "" : filtersState.customerId,
                    })
                  }
                  className={FILTER_INPUT_CLASS}
                  aria-label="Donneur d'ordre"
                >
                  <option value="">Tous les donneurs d&apos;ordre</option>
                  {orderGivers.map((og) => (
                    <option key={og.id} value={og.id}>
                      {og.displayName}
                    </option>
                  ))}
                </select>
              ) : null}
            </>
          )}

          {meta.needsPeriod && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              Max. 2 ans · défaut : 1 mois
            </span>
          )}
        </div>
      )}

      {validType === "mileage_report" && periodValid && (
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Interventions <span className="font-medium">terminées</span> dont la date planifiée est
          dans la période. <span className="font-medium">Km estimés</span> = aller simple agence →
          adresse d’intervention (comme la suggestion d’équipe).{" "}
          <span className="font-medium">Km effectifs</span> = distance entre la position GPS au{" "}
          <span className="font-medium">démarrage</span> et à la{" "}
          <span className="font-medium">fin</span> de l’intervention. Pour les enregistrer, utilisez{" "}
          <span className="font-medium">Ma journée</span> (autoriser la localisation du navigateur)
          : Démarrer puis Terminer sur place. Sans ces deux points GPS, la colonne reste à 0.
          Carburant / coût / CO₂ sont dérivés des km estimés.
        </p>
      )}

      {periodError && <p className="text-sm text-amber-700 dark:text-amber-300">{periodError}</p>}

      {error && periodValid && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-sm text-amber-800 dark:text-amber-200 flex flex-wrap items-center gap-2">
          <span>
            {error instanceof Error ? error.message : "Impossible de charger le rapport."}
          </span>
          <button type="button" onClick={() => void refetch()} className="underline font-medium">
            Réessayer
          </button>
        </div>
      )}

      {periodValid && (
        <div className="relative min-h-[8rem]">
          {showTableLoading && (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/70 dark:bg-slate-950/60 backdrop-blur-[1px]"
              aria-busy="true"
              aria-live="polite"
            >
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                {isLoading ? "Chargement du rapport…" : "Actualisation…"}
              </p>
            </div>
          )}

          {preview && preview.rows.length === 0 && !isLoading && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {meta.needsPeriod || Object.keys(previewFilters).length > 0
                ? "Aucune donnée pour ces critères."
                : "Aucune donnée."}
            </p>
          )}

          {preview && preview.rows.length > 0 && (
            <div
              className={`overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm transition-opacity ${
                showTableLoading ? "opacity-60" : "opacity-100"
              }`}
            >
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <tr>
                    {preview.columns.map((col) => (
                      <th key={col.key} className="px-3 py-2.5 font-medium whitespace-nowrap">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      {preview.columns.map((col) => {
                        const cell = row.cells[col.key] ?? null;
                        return (
                          <td
                            key={col.key}
                            className="px-3 py-2 align-middle text-slate-700 dark:text-slate-200 max-w-[16rem] overflow-hidden"
                          >
                            {isReportEntityRef(cell) ? (
                              <EntityRef kind={cell.kind} id={cell.id} label={cell.label} />
                            ) : cell === null || cell === "" ? (
                              <span className="text-slate-400">—</span>
                            ) : (
                              <span className="truncate block">{String(cell)}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
