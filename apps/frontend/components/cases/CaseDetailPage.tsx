"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/cases.api";
import * as fleetApi from "@/lib/fleet.api";
import * as customersApi from "@/lib/customers.api";
import * as stockApi from "@/lib/stock.api";
import { listOrganizationUsers } from "@/lib/admin.api";
import { DocumentUploadZone } from "@/components/documents/DocumentUploadZone";
import { CaseHistory } from "@/components/cases/CaseHistory";
import { CommentsSection } from "@/components/comments/CommentsSection";
import { CaseQuotesSection } from "@/components/cases/CaseQuotesSection";
import { CaseBillingBanner } from "@/components/cases/CaseBillingBanner";
import { CaseAssigneesTagsInput } from "@/components/cases/CaseAssigneesTagsInput";
import { CaseCustomerPicker } from "@/components/cases/CaseCustomerPicker";
import { CaseInterventionSitePicker } from "@/components/cases/CaseInterventionSitePicker";
import { TeamSuggestionAddonGate } from "@/components/cases/TeamSuggestionAddonGate";
import { CaseProgressTimeline } from "@/components/cases/CaseProgressTimeline";
import {
  InterventionArticlesDialog,
  resolvePreferredStockLocationId,
  type InterventionArticleUsageItem,
} from "@/components/cases/InterventionArticlesDialog";
import { InterventionPhotos } from "@/components/interventions/InterventionPhotos";
import { InterventionSignatureDialog } from "@/components/interventions/InterventionSignatureDialog";
import { QontoInvoiceNumberDialog } from "@/components/cases/QontoInvoiceNumberDialog";
import { CreateCaseInvoiceDialog } from "@/components/cases/CreateCaseInvoiceDialog";
import { CaseInvoiceSyncPanel } from "@/components/cases/CaseInvoiceSyncPanel";
import { CUSTOMER_KIND_LABELS } from "@/components/customers/customer-kind-labels";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { ResourceNotFoundPanel } from "@/components/ui/AppErrorAlert";
import { ExportButton } from "@/components/ui/ExportButton";
import * as exportsApi from "@/lib/exports.api";
import * as integrationsApi from "@/lib/integrations.api";
import * as quotesApi from "@/lib/quotes.api";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { getTeamCalendarCardAppearance } from "@/lib/team-calendar-colors";
import { useIsDarkMode } from "@/lib/use-is-dark-mode";
import { formatPostalAddress } from "@/lib/team-route-insights";
import type {
  BillingStatus,
  CaseCustomerRef,
  CasePriority,
  CaseStatus,
  CustomerSiteResponse,
  SyncCaseInvoiceOptions,
  TeamResponse,
  TodoItemStatus,
} from "@planwise/shared";
import {
  BILLING_STATUS_LABELS,
  canCreateCaseInvoice,
  QONTO_INVOICE_NUMBER_REQUIRED_MESSAGE,
  quoteInvoicedHt,
  remainingQuoteHt,
  remainingQuotePercent,
} from "@planwise/shared";

const STATUS_LABELS: Record<CaseStatus, string> = {
  draft: "Brouillon",
  open: "Ouvert",
  in_progress: "En cours",
  waiting: "En attente",
  completed: "Terminé",
  cancelled: "Annulé",
};

const STATUS_COLORS: Record<CaseStatus, string> = {
  draft:
    "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  open: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  waiting: "bg-purple-50 text-purple-700 border-purple-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
};

const BILLING_STATUS_COLORS: Record<BillingStatus, string> = {
  none: "",
  to_invoice:
    "bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
  invoice_draft:
    "bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800",
  partially_invoiced:
    "bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  invoiced:
    "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  paid: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
};

const PRIORITY_LABELS: Record<CasePriority, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  urgent: "Urgente",
};

function CaseHeaderCustomerContact({ customer }: { customer: CaseCustomerRef }) {
  const addressLine = customer.address ? formatPostalAddress(customer.address) : "";
  const hasContact = Boolean(customer.email || customer.phone || customer.mobile || addressLine);

  if (!hasContact) {
    return (
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        Aucune coordonnée renseignée.
      </p>
    );
  }

  return (
    <dl className="mt-3 grid gap-2 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs sm:grid-cols-2">
      {customer.email ? (
        <div>
          <dt className="text-slate-400 dark:text-slate-500">E-mail</dt>
          <dd className="mt-0.5">
            <a
              href={`mailto:${customer.email}`}
              className="text-brand-600 dark:text-brand-400 hover:text-brand-500 break-all"
            >
              {customer.email}
            </a>
          </dd>
        </div>
      ) : null}
      {customer.phone ? (
        <div>
          <dt className="text-slate-400 dark:text-slate-500">Téléphone</dt>
          <dd className="mt-0.5">
            <a
              href={`tel:${customer.phone}`}
              className="text-slate-700 dark:text-slate-200 hover:text-brand-600 dark:hover:text-brand-400"
            >
              {customer.phone}
            </a>
          </dd>
        </div>
      ) : null}
      {customer.mobile ? (
        <div>
          <dt className="text-slate-400 dark:text-slate-500">Mobile</dt>
          <dd className="mt-0.5">
            <a
              href={`tel:${customer.mobile}`}
              className="text-slate-700 dark:text-slate-200 hover:text-brand-600 dark:hover:text-brand-400"
            >
              {customer.mobile}
            </a>
          </dd>
        </div>
      ) : null}
      {addressLine ? (
        <div className="sm:col-span-2">
          <dt className="text-slate-400 dark:text-slate-500">Adresse</dt>
          <dd className="mt-0.5 text-slate-700 dark:text-slate-200 leading-snug">{addressLine}</dd>
        </div>
      ) : null}
    </dl>
  );
}

function CaseHeaderCustomerCard({
  customer,
  customerId,
  canViewCustomer,
}: {
  customer?: CaseCustomerRef;
  customerId?: string;
  canViewCustomer: boolean;
}) {
  const href = customer?.id ? `/customers/${customer.id}` : undefined;
  const showLink = Boolean(canViewCustomer && href);

  const headerRow = (
    <div className="flex items-start gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-600/25">
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
          />
        </svg>
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">
          Client
        </p>
        {customer ? (
          <>
            <p className="mt-1 text-lg font-semibold text-slate-900 dark:text-white truncate">
              {customer.displayName}
            </p>
            <span className="mt-2 inline-flex rounded-full border border-slate-200 dark:border-slate-600 bg-white/80 dark:bg-slate-800/80 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
              {CUSTOMER_KIND_LABELS[customer.kind] ?? customer.kind}
            </span>
          </>
        ) : (
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Référence client enregistrée
            {customerId ? (
              <span className="mt-1 block font-mono text-xs text-slate-400 dark:text-slate-500 truncate">
                {customerId}
              </span>
            ) : null}
          </p>
        )}
      </div>
      {showLink && (
        <svg
          className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:text-brand-600 dark:group-hover:text-brand-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      )}
    </div>
  );

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm dark:shadow-slate-950/20">
      <div className="p-4 sm:p-5">
        {showLink && href ? (
          <Link
            href={href}
            className="group block rounded-lg no-underline transition hover:bg-slate-50 dark:hover:bg-slate-800/50 -m-2 p-2"
          >
            {headerRow}
          </Link>
        ) : (
          headerRow
        )}
        {customer ? <CaseHeaderCustomerContact customer={customer} /> : null}
      </div>
    </div>
  );
}

const STATUS_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  draft: ["open", "cancelled"],
  open: ["in_progress", "cancelled"],
  in_progress: ["waiting", "completed", "cancelled"],
  waiting: ["in_progress", "cancelled"],
  completed: ["open"],
  cancelled: ["draft"],
};

const INTERVENTION_STATUS_LABELS: Record<string, string> = {
  planned: "Planifiée",
  in_progress: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
};

const INTERVENTION_STATUS_COLORS: Record<string, string> = {
  planned: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
};

function InterventionTeamHighlight({
  teamId,
  teamName,
  teamsById,
}: {
  teamId?: string;
  teamName?: string;
  teamsById: Map<string, TeamResponse>;
}) {
  const isDark = useIsDarkMode();

  if (!teamId && !teamName) return null;
  const team = teamId ? teamsById.get(teamId) : undefined;
  const displayName = teamName ?? team?.name ?? "Équipe";
  const appearance = getTeamCalendarCardAppearance(teamId, team?.calendarColor, isDark);

  return (
    <div
      className={`mt-2.5 flex items-center gap-3 rounded-lg px-3 py-2.5 shadow-sm ${appearance.className}`}
      style={appearance.style}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black/10"
        style={{ color: appearance.style?.color }}
        aria-hidden
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.75}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 2.198a5.001 5.001 0 00-7.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
          />
        </svg>
      </span>
      <div
        className="min-w-0"
        style={appearance.style?.color ? { color: appearance.style.color } : undefined}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide opacity-90">
          Équipe assignée
        </p>
        <p className="text-sm font-semibold truncate">{displayName}</p>
      </div>
    </div>
  );
}

export function CaseDetailPage({ caseId }: { caseId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { showToast } = useToast();
  const { can, canAny } = usePermissions();
  const canAssignCase = canAny(["cases.assign", "cases.update"]);
  const canSyncPennylane = can("integrations.pennylane.sync");
  const canSyncQonto = can("integrations.qonto.sync");
  const canReadPennylane = can("integrations.pennylane.read");
  const canReadQonto = can("integrations.qonto.read");
  const canOpenIntegrations = canAny([
    "integrations.pennylane.read",
    "integrations.qonto.read",
    "integrations.pennylane.configure",
    "integrations.qonto.configure",
  ]);
  const canViewInterventionArticles = can("stock.interventions.read");
  const canAddInterventionArticles = can("stock.interventions.create");
  const showInterventionArticles = canViewInterventionArticles || canAddInterventionArticles;
  const [showNewIntervention, setShowNewIntervention] = useState(false);
  const [editingInterventionId, setEditingInterventionId] = useState<string | null>(null);

  const {
    data: caseData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["case", caseId],
    queryFn: () => api.getCase(caseId),
  });

  const { data: pennylaneStatus, isLoading: pennylaneStatusLoading } = useQuery({
    queryKey: ["integrations", "pennylane"],
    queryFn: () => integrationsApi.getPennylaneStatus(),
    enabled: canReadPennylane,
  });

  const { data: qontoStatus, isLoading: qontoStatusLoading } = useQuery({
    queryKey: ["integrations", "qonto"],
    queryFn: () => integrationsApi.getQontoStatus(),
    enabled: canReadQonto,
  });

  const canReadInvoiceSync = canReadPennylane || canReadQonto;
  const { data: invoiceSyncList } = useQuery({
    queryKey: ["integrations", "invoice-sync", caseId],
    queryFn: () => integrationsApi.getCaseInvoiceSync(caseId),
    enabled: canReadInvoiceSync,
  });
  const invoiceSyncs = invoiceSyncList?.invoices ?? [];

  const { data: caseQuotes = [] } = useQuery({
    queryKey: ["quotes", caseId],
    queryFn: () => quotesApi.listQuotes({ caseId }),
    enabled: can("quotes.read") || canSyncPennylane || canSyncQonto,
  });

  const { data: interventions } = useQuery({
    queryKey: ["interventions", caseId],
    queryFn: () => api.listInterventions({ caseId }),
  });

  const { data: usersData } = useQuery({
    queryKey: ["organization-users"],
    queryFn: () => listOrganizationUsers(),
  });

  const { data: teamsData } = useQuery({
    queryKey: ["teams"],
    queryFn: () => fleetApi.listTeams(),
  });

  const {
    data: agencesData,
    isLoading: agencesRoutingLoading,
    isError: agencesRoutingError,
  } = useQuery({
    queryKey: [
      "fleet-agences-for-routing",
      (teamsData ?? [])
        .map((t) => `${t.id}:${t.agenceId ?? ""}`)
        .sort()
        .join("|"),
    ],
    queryFn: () => fleetApi.resolveAgencesForTeams(teamsData ?? []),
    enabled: !!teamsData?.length && (showNewIntervention || !!editingInterventionId),
  });

  const { data: articles } = useQuery({
    queryKey: ["articles", "intervention-usage"],
    queryFn: () => stockApi.listArticles({ activeOnly: true }),
    enabled: canAddInterventionArticles,
  });

  const { data: stockLocations = [] } = useQuery({
    queryKey: ["stock-locations", "intervention-usage"],
    queryFn: () => stockApi.listStockLocations(),
    enabled: showInterventionArticles,
  });

  const canReadVehicles = canAny(["fleet.vehicles.read", "vehicles.read"]);
  const { data: vehicles = [] } = useQuery({
    queryKey: ["vehicles", "intervention-stock-default"],
    queryFn: () => fleetApi.listVehicles(),
    enabled: showInterventionArticles && canReadVehicles && stockLocations.length > 0,
  });

  const vehicleIdsByTeamId = useMemo(() => {
    const map = new Map<string, string>();
    for (const vehicle of vehicles) {
      if (vehicle.assignedTeamId) {
        map.set(vehicle.assignedTeamId, vehicle.id);
      }
    }
    return map;
  }, [vehicles]);

  const { data: stockMovements } = useQuery({
    queryKey: ["stock-movements", caseId],
    queryFn: () => stockApi.listArticleMovements({ caseId, limit: 200 }),
    enabled: showInterventionArticles,
  });

  const [newIntTitle, setNewIntTitle] = useState("");
  const [newIntDesc, setNewIntDesc] = useState("");
  const [newIntAssignee, setNewIntAssignee] = useState("");
  const [newIntTeamId, setNewIntTeamId] = useState("");
  const [newIntStart, setNewIntStart] = useState("");
  const [newIntEnd, setNewIntEnd] = useState("");
  const plannerCustomerId = caseData?.customerId;
  const { data: plannerCustomer, isLoading: plannerCustomerLoading } = useQuery({
    queryKey: ["customer", plannerCustomerId],
    queryFn: () => customersApi.getCustomer(plannerCustomerId!),
    enabled: !!plannerCustomerId && (showNewIntervention || !!editingInterventionId),
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPriority, setEditPriority] = useState<CasePriority>("medium");
  const [editAssigneeIds, setEditAssigneeIds] = useState<string[]>([]);
  const [editDueDate, setEditDueDate] = useState("");
  const [editCustomerId, setEditCustomerId] = useState("");
  const [editInterventionSiteId, setEditInterventionSiteId] = useState("");
  const [editCustomerSites, setEditCustomerSites] = useState<CustomerSiteResponse[]>([]);
  const [editIntTeamId, setEditIntTeamId] = useState("");
  const [editIntAssignee, setEditIntAssignee] = useState("");
  const [editIntTitle, setEditIntTitle] = useState("");
  const [editIntDesc, setEditIntDesc] = useState("");
  const [editIntStart, setEditIntStart] = useState("");
  const [editIntEnd, setEditIntEnd] = useState("");
  const [interventionError, setInterventionError] = useState("");
  const [articlesDialogInterventionId, setArticlesDialogInterventionId] = useState<string | null>(
    null,
  );
  const [signDialogInterventionId, setSignDialogInterventionId] = useState<string | null>(null);
  const [qontoInvoiceNumberDialogOpen, setQontoInvoiceNumberDialogOpen] = useState(false);
  const [createInvoiceProvider, setCreateInvoiceProvider] = useState<"pennylane" | "qonto" | null>(
    null,
  );
  const [pendingInvoiceOptions, setPendingInvoiceOptions] = useState<SyncCaseInvoiceOptions | null>(
    null,
  );
  const [downloadingReportId, setDownloadingReportId] = useState<string | null>(null);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["case", caseId] });
    queryClient.invalidateQueries({ queryKey: ["interventions", caseId] });
    queryClient.invalidateQueries({ queryKey: ["cases"] });
    queryClient.invalidateQueries({ queryKey: ["stock-movements", caseId] });
    queryClient.invalidateQueries({ queryKey: ["articles"] });
    queryClient.invalidateQueries({ queryKey: ["case-history", caseId] });
  };

  const handleDownloadReport = async (interventionId: string) => {
    setDownloadingReportId(interventionId);
    try {
      await api.downloadInterventionReport(interventionId);
    } catch {
      /* error is handled silently — toast could be added here */
    } finally {
      setDownloadingReportId(null);
    }
  };

  const statusMutation = useMutation({
    mutationFn: (status: CaseStatus) => api.updateCase(caseId, { status }),
    onSuccess: invalidateAll,
  });

  const billingStatusMutation = useMutation({
    mutationFn: (billingStatus: string) => api.updateCase(caseId, { billingStatus }),
    onSuccess: invalidateAll,
  });

  const pennylaneSyncMutation = useMutation({
    mutationFn: (options: SyncCaseInvoiceOptions) =>
      integrationsApi.syncCaseToPennylane(caseId, options),
    onSuccess: (result) => {
      setCreateInvoiceProvider(null);
      setPendingInvoiceOptions(null);
      invalidateAll();
      queryClient.invalidateQueries({ queryKey: ["integrations", "invoice-sync", caseId] });
      showToast(
        result.draft ? "Facture brouillon créée dans Pennylane." : "Facture créée dans Pennylane.",
      );
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const qontoSyncMutation = useMutation({
    mutationFn: (options: SyncCaseInvoiceOptions) =>
      integrationsApi.syncCaseToQonto(caseId, options),
    onSuccess: (result) => {
      setQontoInvoiceNumberDialogOpen(false);
      setCreateInvoiceProvider(null);
      setPendingInvoiceOptions(null);
      invalidateAll();
      queryClient.invalidateQueries({ queryKey: ["integrations", "invoice-sync", caseId] });
      showToast(result.draft ? "Facture brouillon créée dans Qonto." : "Facture créée dans Qonto.");
    },
    onError: (err: Error) => {
      if (err.message === QONTO_INVOICE_NUMBER_REQUIRED_MESSAGE) {
        setQontoInvoiceNumberDialogOpen(true);
        return;
      }
      showToast(err.message, "error");
    },
  });

  const finalizeInvoiceMutation = useMutation({
    mutationFn: (syncId: string) => integrationsApi.finalizeCaseInvoice(caseId, syncId),
    onSuccess: () => {
      invalidateAll();
      queryClient.invalidateQueries({ queryKey: ["integrations", "invoice-sync", caseId] });
      showToast("Facture validée dans l’outil de facturation.");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const refreshInvoiceMutation = useMutation({
    mutationFn: (syncId: string) => integrationsApi.refreshCaseInvoiceSync(caseId, syncId),
    onSuccess: (status) => {
      invalidateAll();
      queryClient.invalidateQueries({ queryKey: ["integrations", "invoice-sync", caseId] });
      showToast(
        status.remoteStatus === "paid"
          ? "Statut actualisé : facture payée."
          : status.remoteStatus === "finalized"
            ? "Statut actualisé : facture validée."
            : "Statut de facture actualisé.",
      );
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const refreshAllInvoicesMutation = useMutation({
    mutationFn: () => integrationsApi.refreshAllCaseInvoiceSyncs(caseId),
    onSuccess: () => {
      invalidateAll();
      queryClient.invalidateQueries({ queryKey: ["integrations", "invoice-sync", caseId] });
      showToast("Factures actualisées.");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const detachInvoiceMutation = useMutation({
    mutationFn: (syncId: string) => integrationsApi.deleteCaseInvoiceSync(caseId, syncId),
    onSuccess: () => {
      invalidateAll();
      queryClient.invalidateQueries({ queryKey: ["integrations", "invoice-sync", caseId] });
      showToast("Facture détachée du dossier.");
    },
    onError: (err: Error) => showToast(err.message, "error"),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: api.UpdateCasePayload) => api.updateCase(caseId, payload),
    onSuccess: () => {
      invalidateAll();
      setIsEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteCase(caseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cases"] });
      router.push("/cases");
    },
  });

  const todoMutation = useMutation({
    mutationFn: (params: { stepId: string; todoId: string; status: TodoItemStatus }) =>
      api.updateTodo(caseId, params),
    onSuccess: invalidateAll,
  });

  const createInterventionMutation = useMutation({
    mutationFn: (payload: api.CreateInterventionPayload) => api.createIntervention(payload),
    onSuccess: () => {
      invalidateAll();
      setShowNewIntervention(false);
      setNewIntTitle("");
      setNewIntDesc("");
      setNewIntAssignee("");
      setNewIntTeamId("");
      setNewIntStart("");
      setNewIntEnd("");
      setInterventionError("");
    },
    onError: (err: Error) => setInterventionError(err.message),
  });

  const updateInterventionMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: api.UpdateInterventionPayload }) =>
      api.updateIntervention(id, payload),
    onSuccess: () => {
      invalidateAll();
      setInterventionError("");
    },
    onError: (err: Error) => setInterventionError(err.message),
  });

  const interventionUsageMap = useMemo(() => {
    const map = new Map<
      string,
      Array<{
        articleId: string;
        articleName: string;
        articleReference?: string;
        unit: string;
        consumedQuantity: number;
        returnedQuantity: number;
        netQuantity: number;
      }>
    >();
    const byInterventionArticle = new Map<
      string,
      {
        interventionId: string;
        articleId: string;
        articleName: string;
        articleReference?: string;
        unit: string;
        consumedQuantity: number;
        returnedQuantity: number;
        netQuantity: number;
      }
    >();
    const articleUnits = new Map((articles ?? []).map((article) => [article.id, article.unit]));

    for (const movement of stockMovements ?? []) {
      if (!movement.interventionId) continue;
      if (movement.movementType !== "in" && movement.movementType !== "out") continue;
      const key = `${movement.interventionId}::${movement.articleId}`;
      const existing = byInterventionArticle.get(key) ?? {
        interventionId: movement.interventionId,
        articleId: movement.articleId,
        articleName: movement.articleName,
        articleReference: movement.articleReference,
        unit: articleUnits.get(movement.articleId) ?? "unité",
        consumedQuantity: 0,
        returnedQuantity: 0,
        netQuantity: 0,
      };
      if (movement.movementType === "out") existing.consumedQuantity += movement.quantity;
      if (movement.movementType === "in") existing.returnedQuantity += movement.quantity;
      existing.netQuantity = Math.max(existing.consumedQuantity - existing.returnedQuantity, 0);
      byInterventionArticle.set(key, existing);
    }

    for (const value of byInterventionArticle.values()) {
      const existing = map.get(value.interventionId) ?? [];
      existing.push({
        articleId: value.articleId,
        articleName: value.articleName,
        articleReference: value.articleReference,
        unit: value.unit,
        consumedQuantity: value.consumedQuantity,
        returnedQuantity: value.returnedQuantity,
        netQuantity: value.netQuantity,
      });
      map.set(value.interventionId, existing);
    }
    return map;
  }, [articles, stockMovements]);

  const teamsById = useMemo(() => {
    const map = new Map<string, TeamResponse>();
    for (const team of teamsData ?? []) {
      map.set(team.id, team);
    }
    return map;
  }, [teamsData]);

  const assigneePickerOptions = useMemo(() => {
    if (!caseData) return [] as { id: string; label: string }[];
    const map = new Map<string, string>();
    for (const u of usersData?.users ?? []) {
      map.set(u.id, u.name?.trim() || u.email);
    }
    for (const a of caseData.assignees) {
      if (!map.has(a.userId)) map.set(a.userId, a.name);
    }
    return [...map.entries()].map(([id, label]) => ({ id, label }));
  }, [caseData, usersData?.users]);

  if (isLoading) {
    return <div className="text-sm text-slate-500 dark:text-slate-400">Chargement…</div>;
  }

  if (isError || !caseData) {
    return (
      <ResourceNotFoundPanel
        error={isError ? error : undefined}
        resourceLabel="Dossier"
        backHref="/cases"
        backLabel="← Retour aux dossiers"
        onRetry={() => void refetch()}
      />
    );
  }

  const articlesDialogIntervention = interventions?.find(
    (i) => i.id === articlesDialogInterventionId,
  );

  const integrationsStatusLoading =
    (canReadPennylane && pennylaneStatusLoading) || (canReadQonto && qontoStatusLoading);
  const showPennylaneSend =
    canSyncPennylane && Boolean(pennylaneStatus?.connected) && !integrationsStatusLoading;
  const showQontoSend =
    canSyncQonto && Boolean(qontoStatus?.connected) && !integrationsStatusLoading;
  const showConnectBillingTool =
    canCreateCaseInvoice(caseData.billingStatus) &&
    !integrationsStatusLoading &&
    !showPennylaneSend &&
    !showQontoSend &&
    (canOpenIntegrations || canSyncPennylane || canSyncQonto);

  const billingActions =
    canCreateCaseInvoice(caseData.billingStatus) && !integrationsStatusLoading ? (
      showPennylaneSend || showQontoSend ? (
        <>
          {showPennylaneSend ? (
            <button
              type="button"
              disabled={pennylaneSyncMutation.isPending || qontoSyncMutation.isPending}
              onClick={() => setCreateInvoiceProvider("pennylane")}
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 shadow-sm"
            >
              {pennylaneSyncMutation.isPending ? "Envoi Pennylane…" : "Créer une facture Pennylane"}
            </button>
          ) : null}
          {showQontoSend ? (
            <button
              type="button"
              disabled={qontoSyncMutation.isPending || pennylaneSyncMutation.isPending}
              onClick={() => setCreateInvoiceProvider("qonto")}
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-medium text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 shadow-sm"
            >
              {qontoSyncMutation.isPending ? "Envoi Qonto…" : "Créer une facture Qonto"}
            </button>
          ) : null}
        </>
      ) : showConnectBillingTool ? (
        <Link
          href="/settings/integrations"
          className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-500 shadow-sm"
        >
          Connecter son outil de facturation
        </Link>
      ) : undefined
    ) : undefined;

  const allowedTransitions = STATUS_TRANSITIONS[caseData.status] ?? [];
  const isOverdue =
    caseData.dueDate &&
    new Date(caseData.dueDate) < new Date() &&
    caseData.status !== "completed" &&
    caseData.status !== "cancelled";

  const startEditing = () => {
    setEditTitle(caseData.title);
    setEditDesc(caseData.description ?? "");
    setEditPriority(caseData.priority);
    setEditAssigneeIds(caseData.assignees.map((a) => a.userId));
    setEditDueDate(caseData.dueDate ? caseData.dueDate.split("T")[0] : "");
    setEditCustomerId(caseData.customerId ?? "");
    setEditInterventionSiteId(caseData.interventionSiteId ?? "");
    setEditCustomerSites(caseData.customer?.sites ?? []);
    setIsEditing(true);
  };

  const handleEditCustomerChange = (newCustomerId: string) => {
    setEditCustomerId(newCustomerId);
    setEditInterventionSiteId("");
    if (newCustomerId) {
      void customersApi.getCustomer(newCustomerId).then((c) => {
        setEditCustomerSites(c.sites ?? []);
        const defaultSite = c.sites?.find((s) => s.isDefault);
        if (defaultSite) setEditInterventionSiteId(defaultSite.id);
      });
    } else {
      setEditCustomerSites([]);
    }
  };

  const handleEditSubmit = () => {
    updateMutation.mutate({
      title: editTitle,
      description: editDesc || undefined,
      priority: editPriority,
      assigneeIds: editAssigneeIds,
      dueDate: editDueDate || null,
      customerId: editCustomerId.trim() ? editCustomerId.trim() : null,
      interventionSiteId: editInterventionSiteId || null,
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/cases"
            className="text-sm text-brand-600 dark:text-brand-400 hover:text-brand-500 font-medium"
          >
            &larr; Dossiers
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleEditSubmit}
                  disabled={updateMutation.isPending}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition"
                >
                  {updateMutation.isPending ? "…" : "Enregistrer"}
                </button>
              </>
            ) : can("cases.update") ? (
              <button
                type="button"
                onClick={startEditing}
                className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Modifier
              </button>
            ) : null}
            {can("exports.cases") && (
              <ExportButton
                onExport={() => exportsApi.exportCaseSummaryPdf(caseId)}
                formats={["pdf"]}
                label="PDF"
              />
            )}
            {can("cases.delete") && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirm({
                    title: "Supprimer ce dossier ?",
                    description:
                      "Toutes les interventions liées seront supprimées définitivement. Cette action ne peut pas être annulée.",
                    confirmLabel: "Supprimer le dossier",
                    variant: "danger",
                  });
                  if (ok) deleteMutation.mutate();
                }}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition"
              >
                Supprimer
              </button>
            )}
          </div>
        </div>

        <div className="min-w-0">
          {isEditing ? (
            <div className="space-y-4 w-full">
              <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2.5 text-sm text-amber-950">
                <div className="flex flex-wrap items-center gap-2 font-medium text-amber-900">
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide">
                    Édition
                  </span>
                  <span>Modification des informations du dossier</span>
                </div>
                <p className="mt-1.5 text-xs text-amber-900/80 leading-relaxed">
                  Le <strong>statut</strong> ne se modifie pas ici : une fois revenu sur la fiche
                  (après enregistrement ou annulation), utilisez l&apos;en-tête{" "}
                  <strong>Progression</strong> en haut de la fiche.
                </p>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300">
                <span className="text-slate-500 dark:text-slate-400">Dossier concerné :</span>{" "}
                <span className="font-medium text-slate-800 dark:text-slate-100">
                  {caseData.title}
                </span>
              </p>

              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm dark:shadow-slate-950/20 space-y-6">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Informations à mettre à jour
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Titre, description, priorité, échéance et personnes assignées. Pensez à
                    enregistrer vos changements.
                  </p>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 xl:gap-10">
                  <div className="space-y-5 min-w-0">
                    <div>
                      <label
                        htmlFor="case-edit-title"
                        className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                      >
                        Titre du dossier
                      </label>
                      <input
                        id="case-edit-title"
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        placeholder="Ex. Rénovation immeuble rue des Lilas"
                      />
                    </div>

                    <div className="flex flex-col flex-1 min-h-0">
                      <label
                        htmlFor="case-edit-desc"
                        className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                      >
                        Description
                      </label>
                      <textarea
                        id="case-edit-desc"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        rows={8}
                        className="w-full min-h-[12rem] rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 xl:min-h-[14rem]"
                        placeholder="Contexte, objectifs, contraintes…"
                      />
                    </div>
                  </div>

                  <div className="space-y-5 min-w-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4">
                      <div>
                        <label
                          htmlFor="case-edit-priority"
                          className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                        >
                          Priorité
                        </label>
                        <select
                          id="case-edit-priority"
                          value={editPriority}
                          onChange={(e) => setEditPriority(e.target.value as CasePriority)}
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                          <option value="low">Basse</option>
                          <option value="medium">Moyenne</option>
                          <option value="high">Haute</option>
                          <option value="urgent">Urgente</option>
                        </select>
                      </div>
                      <div>
                        <label
                          htmlFor="case-edit-due"
                          className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1"
                        >
                          Date d&apos;échéance
                        </label>
                        <input
                          id="case-edit-due"
                          type="date"
                          value={editDueDate}
                          onChange={(e) => setEditDueDate(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Laisser vide si aucune échéance fixée.
                        </p>
                      </div>
                    </div>

                    <div>
                      <span className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1.5">
                        Personnes assignées
                      </span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                        Recherchez un membre de l&apos;organisation pour l&apos;ajouter ou retirez
                        un tag.
                      </p>
                      <CaseAssigneesTagsInput
                        options={assigneePickerOptions}
                        value={editAssigneeIds}
                        onChange={setEditAssigneeIds}
                        placeholder="Rechercher un membre à assigner…"
                      />
                    </div>

                    <CaseCustomerPicker
                      idPrefix="case-edit-customer"
                      value={editCustomerId}
                      initialDisplayName={caseData.customer?.displayName}
                      onChange={handleEditCustomerChange}
                      disabled={updateMutation.isPending}
                    />

                    {editCustomerId && editCustomerSites.length > 0 && (
                      <CaseInterventionSitePicker
                        sites={editCustomerSites}
                        value={editInterventionSiteId}
                        onChange={setEditInterventionSiteId}
                        disabled={updateMutation.isPending}
                      />
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <button
                    type="button"
                    onClick={handleEditSubmit}
                    disabled={updateMutation.isPending}
                    className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition"
                  >
                    {updateMutation.isPending ? "Enregistrement…" : "Enregistrer les modifications"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <CaseProgressTimeline
              title={caseData.title}
              description={caseData.description}
              titleBadges={
                <>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[caseData.status]}`}
                  >
                    {STATUS_LABELS[caseData.status]}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      caseData.priority === "urgent"
                        ? "bg-red-50 text-red-600"
                        : caseData.priority === "high"
                          ? "bg-orange-50 text-orange-600"
                          : caseData.priority === "medium"
                            ? "bg-blue-50 text-blue-600"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {PRIORITY_LABELS[caseData.priority]}
                  </span>
                  {caseData.billingStatus && caseData.billingStatus !== "none" && (
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${BILLING_STATUS_COLORS[caseData.billingStatus]}`}
                    >
                      {BILLING_STATUS_LABELS[caseData.billingStatus]}
                    </span>
                  )}
                  {isOverdue && (
                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                      En retard
                    </span>
                  )}
                </>
              }
              details={
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  {(caseData.customer || caseData.customerId) && (
                    <div className="min-w-0 flex-1 lg:max-w-xl">
                      <CaseHeaderCustomerCard
                        customer={caseData.customer}
                        customerId={caseData.customerId}
                        canViewCustomer={can("customers.read")}
                      />
                    </div>
                  )}
                  <div
                    className={`w-full shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm dark:shadow-slate-950/20 ${
                      caseData.customer || caseData.customerId
                        ? "lg:w-[min(100%,20rem)] lg:ml-auto"
                        : "lg:max-w-md lg:ml-auto"
                    }`}
                  >
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Assignés
                    </h2>
                    <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                      Membres responsables de ce dossier
                    </p>
                    <div className="mt-3">
                      <CaseAssigneesTagsInput
                        options={assigneePickerOptions}
                        value={caseData.assignees.map((a) => a.userId)}
                        onChange={(ids) => updateMutation.mutate({ assigneeIds: ids })}
                        disabled={!canAssignCase || updateMutation.isPending}
                        placeholder="Rechercher un membre à assigner…"
                      />
                    </div>
                  </div>
                </div>
              }
              meta={
                <>
                  {caseData.dueDate && (
                    <span>Échéance : {new Date(caseData.dueDate).toLocaleDateString("fr-FR")}</span>
                  )}
                  {caseData.tags.length > 0 && (
                    <span className="flex flex-wrap gap-1">
                      {caseData.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px]"
                        >
                          {t}
                        </span>
                      ))}
                    </span>
                  )}
                </>
              }
              progress={caseData.progress}
              steps={caseData.steps}
              canUpdateStatus={can("cases.update")}
              allowedTransitions={allowedTransitions}
              onStatusChange={(s) => statusMutation.mutate(s)}
              statusChangePending={statusMutation.isPending}
              canUpdateTodos={can("cases.update")}
              onTodoStatusChange={(stepId, todoId, status) =>
                todoMutation.mutate({ stepId, todoId, status })
              }
            />
          )}
        </div>
      </div>

      {(canAny(["cases.manage_billing", "cases.update"]) ||
        (caseData.billingStatus && caseData.billingStatus !== "none")) && (
        <CaseBillingBanner
          status={caseData.billingStatus ?? "none"}
          canEdit={canAny(["cases.manage_billing", "cases.update"])}
          pending={billingStatusMutation.isPending}
          onChange={(billingStatus) => billingStatusMutation.mutate(billingStatus)}
          actions={billingActions}
          syncPanel={
            invoiceSyncs.length > 0 ? (
              <CaseInvoiceSyncPanel
                invoices={invoiceSyncs}
                canSync={
                  invoiceSyncs.some((i) => i.provider === "qonto") ? canSyncQonto : canSyncPennylane
                }
                finalizePendingId={
                  finalizeInvoiceMutation.isPending
                    ? (finalizeInvoiceMutation.variables ?? null)
                    : null
                }
                refreshPending={
                  refreshInvoiceMutation.isPending || refreshAllInvoicesMutation.isPending
                }
                onFinalize={async (syncId) => {
                  const ok = await confirm({
                    title: "Valider la facture brouillon ?",
                    description:
                      "La facture sera finalisée dans l’outil de facturation. Cette action peut être irréversible côté provider.",
                    confirmLabel: "Valider",
                  });
                  if (ok) finalizeInvoiceMutation.mutate(syncId);
                }}
                onRefreshOne={(syncId) => refreshInvoiceMutation.mutate(syncId)}
                onRefreshAll={() => refreshAllInvoicesMutation.mutate()}
                detachPendingId={
                  detachInvoiceMutation.isPending ? (detachInvoiceMutation.variables ?? null) : null
                }
                onDetach={async (syncId) => {
                  const ok = await confirm({
                    title: "Détacher cette facture ?",
                    description:
                      "La liaison avec le dossier sera supprimée. La facture distante (annulée) n’est pas modifiée.",
                    confirmLabel: "Détacher",
                    variant: "danger",
                  });
                  if (ok) detachInvoiceMutation.mutate(syncId);
                }}
              />
            ) : undefined
          }
          quoteProgress={
            caseQuotes.some(
              (q) => q.status === "accepted" || quoteInvoicedHt(invoiceSyncs, q.id) > 0,
            ) ? (
              <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                {caseQuotes
                  .filter((q) => q.status === "accepted" || quoteInvoicedHt(invoiceSyncs, q.id) > 0)
                  .map((q) => {
                    const invoiced = quoteInvoicedHt(invoiceSyncs, q.id);
                    const remaining = remainingQuoteHt(q.totalHt, invoiced);
                    const pct = remainingQuotePercent(q.totalHt, remaining);
                    return (
                      <li key={q.id}>
                        <span className="font-medium">{q.quoteNumber}</span>
                        {" · "}
                        facturé {invoiced.toFixed(2)} € HT
                        {" · reste "}
                        <span className="font-semibold text-amber-800 dark:text-amber-200">
                          {remaining.toFixed(2)} € HT ({pct} %)
                        </span>
                      </li>
                    );
                  })}
              </ul>
            ) : undefined
          }
        />
      )}

      {!isEditing && (
        <>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                Interventions ({interventions?.length ?? 0})
              </h2>
              {can("interventions.create") && (
                <button
                  onClick={() => setShowNewIntervention(!showNewIntervention)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:bg-slate-800 transition self-start"
                >
                  {showNewIntervention ? "Annuler" : "+ Planifier une intervention"}
                </button>
              )}
            </div>

            {interventionError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {interventionError}
              </div>
            )}

            {showNewIntervention && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 shadow-sm dark:shadow-slate-950/20 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={newIntTitle}
                    onChange={(e) => setNewIntTitle(e.target.value)}
                    placeholder="Titre de l'intervention"
                    className="sm:col-span-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  />
                  <textarea
                    value={newIntDesc}
                    onChange={(e) => setNewIntDesc(e.target.value)}
                    placeholder="Description (optionnelle)"
                    rows={2}
                    className="sm:col-span-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  />
                  <select
                    value={newIntTeamId}
                    onChange={(e) => setNewIntTeamId(e.target.value)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
                  >
                    <option value="">Équipe (aucune)</option>
                    {teamsData?.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={newIntAssignee}
                    onChange={(e) => setNewIntAssignee(e.target.value)}
                    className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
                  >
                    <option value="">Assignée à (personne)</option>
                    {usersData?.users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name ?? u.email}
                      </option>
                    ))}
                  </select>
                  {plannerCustomerLoading && plannerCustomerId ? (
                    <div className="sm:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-4 animate-pulse">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-3" />
                      <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                    </div>
                  ) : (
                    <div className="sm:col-span-2">
                      <TeamSuggestionAddonGate
                        teams={teamsData ?? []}
                        agences={agencesData ?? []}
                        agencesLoading={agencesRoutingLoading}
                        agencesError={agencesRoutingError}
                        customerLinked={Boolean(plannerCustomerId)}
                        customerAddress={caseData.interventionAddress ?? plannerCustomer?.address}
                        selectedTeamId={newIntTeamId}
                        onSelectTeam={setNewIntTeamId}
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400">Début</label>
                    <input
                      type="datetime-local"
                      value={newIntStart}
                      onChange={(e) => setNewIntStart(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 dark:text-slate-400">Fin</label>
                    <input
                      type="datetime-local"
                      value={newIntEnd}
                      onChange={(e) => setNewIntEnd(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (!newIntTitle.trim()) return;
                    createInterventionMutation.mutate({
                      caseId,
                      title: newIntTitle.trim(),
                      description: newIntDesc.trim() || undefined,
                      assigneeId: newIntAssignee || undefined,
                      assignedTeamId: newIntTeamId || undefined,
                      scheduledStart: newIntStart ? new Date(newIntStart).toISOString() : undefined,
                      scheduledEnd: newIntEnd ? new Date(newIntEnd).toISOString() : undefined,
                    });
                  }}
                  disabled={createInterventionMutation.isPending}
                  className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition"
                >
                  Créer l&apos;intervention
                </button>
              </div>
            )}

            {interventions && interventions.length > 0 ? (
              <div className="space-y-2">
                {interventions.map((intervention) => {
                  const usedArticles = (interventionUsageMap.get(intervention.id) ?? []).filter(
                    (item) => item.netQuantity > 0,
                  );
                  const isEditingThis = editingInterventionId === intervention.id;

                  const startEditingIntervention = () => {
                    setEditingInterventionId(intervention.id);
                    setEditIntTitle(intervention.title);
                    setEditIntDesc(intervention.description ?? "");
                    setEditIntTeamId(intervention.assignedTeamId ?? "");
                    setEditIntAssignee(intervention.assigneeId ?? "");
                    setEditIntStart(
                      intervention.scheduledStart ? intervention.scheduledStart.slice(0, 16) : "",
                    );
                    setEditIntEnd(
                      intervention.scheduledEnd ? intervention.scheduledEnd.slice(0, 16) : "",
                    );
                    setInterventionError("");
                  };

                  const cancelEditingIntervention = () => {
                    setEditingInterventionId(null);
                    setInterventionError("");
                  };

                  const submitEditIntervention = () => {
                    if (!editIntTitle.trim()) return;
                    updateInterventionMutation.mutate(
                      {
                        id: intervention.id,
                        payload: {
                          title: editIntTitle.trim(),
                          description: editIntDesc.trim() || undefined,
                          assignedTeamId: editIntTeamId || null,
                          assigneeId: editIntAssignee || null,
                          scheduledStart: editIntStart
                            ? new Date(editIntStart).toISOString()
                            : null,
                          scheduledEnd: editIntEnd ? new Date(editIntEnd).toISOString() : null,
                        },
                      },
                      { onSuccess: () => setEditingInterventionId(null) },
                    );
                  };

                  return (
                    <div
                      key={intervention.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 shadow-sm dark:shadow-slate-950/20"
                    >
                      {isEditingThis ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                              type="text"
                              value={editIntTitle}
                              onChange={(e) => setEditIntTitle(e.target.value)}
                              placeholder="Titre de l'intervention"
                              className="sm:col-span-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                            />
                            <textarea
                              value={editIntDesc}
                              onChange={(e) => setEditIntDesc(e.target.value)}
                              placeholder="Description (optionnelle)"
                              rows={2}
                              className="sm:col-span-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                            />
                            <select
                              value={editIntTeamId}
                              onChange={(e) => setEditIntTeamId(e.target.value)}
                              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
                            >
                              <option value="">Équipe (aucune)</option>
                              {teamsData?.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                            <select
                              value={editIntAssignee}
                              onChange={(e) => setEditIntAssignee(e.target.value)}
                              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
                            >
                              <option value="">Assignée à (personne)</option>
                              {usersData?.users.map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.name ?? u.email}
                                </option>
                              ))}
                            </select>
                            {plannerCustomerLoading && plannerCustomerId ? (
                              <div className="sm:col-span-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-4 animate-pulse">
                                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-48 mb-3" />
                                <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                              </div>
                            ) : (
                              <div className="sm:col-span-2">
                                <TeamSuggestionAddonGate
                                  teams={teamsData ?? []}
                                  agences={agencesData ?? []}
                                  agencesLoading={agencesRoutingLoading}
                                  agencesError={agencesRoutingError}
                                  customerLinked={Boolean(plannerCustomerId)}
                                  customerAddress={
                                    caseData.interventionAddress ?? plannerCustomer?.address
                                  }
                                  selectedTeamId={editIntTeamId}
                                  onSelectTeam={setEditIntTeamId}
                                />
                              </div>
                            )}
                            <div>
                              <label className="text-xs text-slate-500 dark:text-slate-400">
                                Début
                              </label>
                              <input
                                type="datetime-local"
                                value={editIntStart}
                                onChange={(e) => setEditIntStart(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-500 dark:text-slate-400">
                                Fin
                              </label>
                              <input
                                type="datetime-local"
                                value={editIntEnd}
                                onChange={(e) => setEditIntEnd(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={submitEditIntervention}
                              disabled={updateInterventionMutation.isPending}
                              className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-500 disabled:opacity-50 transition"
                            >
                              {updateInterventionMutation.isPending ? "…" : "Enregistrer"}
                            </button>
                            <button
                              onClick={cancelEditingIntervention}
                              className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm text-slate-800 dark:text-slate-100">
                                {intervention.title}
                              </h4>
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                                  INTERVENTION_STATUS_COLORS[intervention.status] ?? ""
                                }`}
                              >
                                {INTERVENTION_STATUS_LABELS[intervention.status] ??
                                  intervention.status}
                              </span>
                              {intervention.billingStatus &&
                                intervention.billingStatus !== "none" && (
                                  <span
                                    className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${BILLING_STATUS_COLORS[intervention.billingStatus]}`}
                                  >
                                    {BILLING_STATUS_LABELS[intervention.billingStatus]}
                                  </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1">
                              {can("interventions.update") && (
                                <button
                                  onClick={startEditingIntervention}
                                  className="text-[10px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                                >
                                  Modifier l&apos;intervention
                                </button>
                              )}
                              {intervention.status === "planned" && (
                                <button
                                  onClick={() =>
                                    api.startIntervention(intervention.id).then(() => {
                                      void queryClient.invalidateQueries({
                                        queryKey: ["interventions", caseId],
                                      });
                                    })
                                  }
                                  className="text-[10px] text-amber-600 hover:text-amber-700 px-1.5 py-0.5 rounded bg-amber-50"
                                >
                                  Démarrer
                                </button>
                              )}
                              {intervention.status === "in_progress" && (
                                <button
                                  onClick={() =>
                                    api.completeIntervention(intervention.id).then(() => {
                                      void queryClient.invalidateQueries({
                                        queryKey: ["interventions", caseId],
                                      });
                                    })
                                  }
                                  className="text-[10px] text-green-600 hover:text-green-700 px-1.5 py-0.5 rounded bg-green-50"
                                >
                                  Terminer
                                </button>
                              )}
                            </div>
                          </div>
                          <InterventionTeamHighlight
                            teamId={intervention.assignedTeamId}
                            teamName={intervention.assignedTeamName}
                            teamsById={teamsById}
                          />
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                            {intervention.assigneeName && (
                              <span className="inline-flex items-center gap-1">
                                <span className="text-slate-400 dark:text-slate-500">
                                  Assigné :
                                </span>
                                <span className="font-medium text-slate-600 dark:text-slate-300">
                                  {intervention.assigneeName}
                                </span>
                              </span>
                            )}
                            {intervention.scheduledStart && (
                              <span>
                                {new Date(intervention.scheduledStart).toLocaleDateString("fr-FR")}{" "}
                                {new Date(intervention.scheduledStart).toLocaleTimeString("fr-FR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            )}
                            {intervention.scheduledEnd && (
                              <span>
                                &rarr;{" "}
                                {new Date(intervention.scheduledEnd).toLocaleTimeString("fr-FR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            )}
                          </div>
                          {intervention.description && (
                            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                              {intervention.description}
                            </p>
                          )}

                          {showInterventionArticles && (
                            <div className="mt-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                  Articles utilisés
                                </p>
                                {canAddInterventionArticles && (
                                  <button
                                    type="button"
                                    onClick={() => setArticlesDialogInterventionId(intervention.id)}
                                    className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                                  >
                                    {usedArticles.length > 0
                                      ? "Modifier les articles"
                                      : "Ajouter des articles"}
                                  </button>
                                )}
                              </div>
                              {canViewInterventionArticles && usedArticles.length > 0 ? (
                                <ul className="mt-2 space-y-1">
                                  {usedArticles.map((item) => (
                                    <li
                                      key={item.articleId}
                                      className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-slate-600 dark:text-slate-300"
                                    >
                                      <span>
                                        {item.articleName}
                                        {item.articleReference ? (
                                          <span className="text-slate-400 dark:text-slate-500">
                                            {" "}
                                            · {item.articleReference}
                                          </span>
                                        ) : null}
                                      </span>
                                      <span className="tabular-nums font-medium text-slate-700 dark:text-slate-200">
                                        {item.netQuantity} {item.unit}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              ) : canViewInterventionArticles ? (
                                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                                  Aucun article déclaré.
                                </p>
                              ) : null}
                            </div>
                          )}

                          <InterventionPhotos
                            interventionId={intervention.id}
                            readOnly={!can("interventions.update")}
                          />

                          {/* Signature & report */}
                          {intervention.status === "completed" && (
                            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                              {can("interventions.sign") && !intervention.signedAt && (
                                <button
                                  type="button"
                                  onClick={() => setSignDialogInterventionId(intervention.id)}
                                  className="inline-flex items-center gap-1 rounded-md border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-950/30 px-2 py-1 text-[11px] font-medium text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-950/50 transition"
                                >
                                  <svg
                                    className="h-3.5 w-3.5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                                    />
                                  </svg>
                                  Faire signer
                                </button>
                              )}
                              {intervention.signedAt && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-green-600 dark:text-green-400 font-medium">
                                  <svg
                                    className="h-3.5 w-3.5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                  </svg>
                                  Signé par {intervention.signatoryName}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDownloadReport(intervention.id)}
                                disabled={downloadingReportId === intervention.id}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
                              >
                                <svg
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                                  />
                                </svg>
                                {downloadingReportId === intervention.id
                                  ? "Génération…"
                                  : "Rapport PDF"}
                              </button>
                            </div>
                          )}

                          <CommentsSection
                            entityType="intervention"
                            entityId={intervention.id}
                            caseId={caseId}
                            compact
                            title="Commentaires"
                          />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              !showNewIntervention && (
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Aucune intervention planifiée pour ce dossier.
                </div>
              )
            )}
          </div>
        </>
      )}

      {articlesDialogIntervention && (
        <InterventionArticlesDialog
          open={articlesDialogInterventionId === articlesDialogIntervention.id}
          onClose={() => setArticlesDialogInterventionId(null)}
          interventionId={articlesDialogIntervention.id}
          interventionTitle={articlesDialogIntervention.title}
          caseId={caseId}
          currentUsage={
            (interventionUsageMap.get(articlesDialogIntervention.id) ??
              []) as InterventionArticleUsageItem[]
          }
          articles={articles ?? []}
          locations={stockLocations}
          preferredLocationId={resolvePreferredStockLocationId(stockLocations, {
            assignedTeamId: articlesDialogIntervention.assignedTeamId,
            vehicleIdsByTeamId,
          })}
          canEdit={canAddInterventionArticles}
          onSaved={invalidateAll}
        />
      )}

      {signDialogInterventionId && (
        <InterventionSignatureDialog
          interventionId={signDialogInterventionId}
          open={!!signDialogInterventionId}
          onClose={() => {
            setSignDialogInterventionId(null);
            invalidateAll();
          }}
        />
      )}

      <QontoInvoiceNumberDialog
        open={qontoInvoiceNumberDialogOpen}
        pending={qontoSyncMutation.isPending}
        onClose={() => setQontoInvoiceNumberDialogOpen(false)}
        onSubmit={(invoiceNumber) => {
          if (!pendingInvoiceOptions?.quoteId) {
            showToast("Sélectionnez un devis avant d’envoyer la facture.", "error");
            return;
          }
          qontoSyncMutation.mutate({ ...pendingInvoiceOptions, invoiceNumber });
        }}
      />

      <CreateCaseInvoiceDialog
        open={createInvoiceProvider != null}
        pending={pennylaneSyncMutation.isPending || qontoSyncMutation.isPending}
        providerLabel={createInvoiceProvider === "qonto" ? "Qonto" : "Pennylane"}
        quotes={caseQuotes}
        invoices={invoiceSyncs}
        onClose={() => {
          setCreateInvoiceProvider(null);
          setPendingInvoiceOptions(null);
        }}
        onSubmit={(options) => {
          setPendingInvoiceOptions(options);
          if (createInvoiceProvider === "qonto") {
            qontoSyncMutation.mutate(options);
          } else {
            pennylaneSyncMutation.mutate(options);
          }
        }}
      />

      <CaseQuotesSection caseId={caseId} invoices={invoiceSyncs} />

      <CommentsSection entityType="case" entityId={caseId} />

      <DocumentUploadZone entityType="case" entityId={caseId} />

      <CaseHistory caseId={caseId} />
    </div>
  );
}
