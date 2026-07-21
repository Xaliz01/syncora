/** API contracts for cases-service (templates, cases, interventions) */

import type { CustomerKind, PostalAddress } from "./customer";

// ── Statuses ──

export type CaseStatus = "draft" | "open" | "in_progress" | "waiting" | "completed" | "cancelled";

export type InterventionStatus = "planned" | "in_progress" | "completed" | "cancelled";

// ── Billing status (Phase 3.4) ──

export const BILLING_STATUSES = [
  "none",
  "to_invoice",
  "invoice_draft",
  "partially_invoiced",
  "invoiced",
  "paid",
] as const;
export type BillingStatus = (typeof BILLING_STATUSES)[number];

export const BILLING_STATUS_LABELS: Record<BillingStatus, string> = {
  none: "Non applicable",
  to_invoice: "À facturer",
  invoice_draft: "Brouillon facture",
  partially_invoiced: "Partiellement facturé",
  invoiced: "Facturé",
  paid: "Payé",
};

/** Ordre métier pour n’upgrader le statut CRM que vers l’avant. */
export const BILLING_STATUS_RANK: Record<BillingStatus, number> = {
  none: 0,
  to_invoice: 1,
  invoice_draft: 2,
  partially_invoiced: 3,
  invoiced: 4,
  paid: 5,
};

/** Statuts depuis lesquels on peut encore créer une facture (1-n / situations). */
export const BILLING_STATUSES_ALLOWING_INVOICE_CREATE: readonly BillingStatus[] = [
  "to_invoice",
  "invoice_draft",
  "partially_invoiced",
];

export function canCreateCaseInvoice(status: BillingStatus): boolean {
  return (BILLING_STATUSES_ALLOWING_INVOICE_CREATE as readonly string[]).includes(status);
}

/**
 * Lorsqu’un devis est accepté, on peut passer le dossier à « À facturer »
 * uniquement s’il n’est pas déjà plus avancé dans le cycle de facturation.
 */
export function shouldSetToInvoiceOnQuoteAccepted(current: BillingStatus): boolean {
  return BILLING_STATUS_RANK[current] < BILLING_STATUS_RANK.to_invoice;
}

export function shouldUpgradeBillingStatus(current: BillingStatus, next: BillingStatus): boolean {
  return BILLING_STATUS_RANK[next] > BILLING_STATUS_RANK[current];
}

/** Coordonnées GPS légères (géolocalisation terrain). */
export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export type TodoItemStatus = "pending" | "done" | "skipped";
export type CasePriority = "low" | "medium" | "high" | "urgent";

// ── Case templates ──

export type TodoDashboardVisibility = "all" | "by_profile" | "by_user";

export interface TodoDashboardRule {
  showOnDashboard: boolean;
  visibility?: TodoDashboardVisibility;
  profileIds?: string[];
  userIds?: string[];
}

export interface TemplateStepTodo {
  label: string;
  description?: string;
  dashboardRule?: TodoDashboardRule;
}

export interface TemplateStep {
  name: string;
  description?: string;
  order: number;
  todos: TemplateStepTodo[];
}

export interface CreateCaseTemplateBody {
  organizationId: string;
  name: string;
  description?: string;
  steps: TemplateStep[];
  isTestData?: boolean;
}

export interface UpdateCaseTemplateBody {
  organizationId: string;
  name?: string;
  description?: string;
  steps?: TemplateStep[];
}

export interface CaseTemplateResponse {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  steps: TemplateStep[];
  createdAt?: string;
  updatedAt?: string;
  isTestData?: boolean;
}

export interface DashboardTodoItem {
  todoLabel: string;
  stepName: string;
  templateId: string;
  templateName: string;
  count: number;
}

export interface DashboardTodoCaseItem {
  caseId: string;
  caseTitle: string;
  customerId?: string;
  customerName?: string;
  status: CaseStatus;
  priority: CasePriority;
  createdAt?: string;
  dueDate?: string;
}

/** Filtres des statistiques du tableau de bord (popup liste de dossiers). */
export const DASHBOARD_STAT_FILTERS = [
  "assigned",
  "in_progress",
  "completed_week",
  "overdue",
  "to_invoice",
] as const;

export type DashboardStatFilter = (typeof DASHBOARD_STAT_FILTERS)[number];

export function isDashboardStatFilter(value: string): value is DashboardStatFilter {
  return (DASHBOARD_STAT_FILTERS as readonly string[]).includes(value);
}

// ── Case ──

export interface CaseAssignee {
  userId: string;
  name: string;
}

/** Client rattaché au dossier (aperçu) */
export interface CaseCustomerRef {
  id: string;
  displayName: string;
  kind: CustomerKind;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: PostalAddress;
  sites?: import("./customer").CustomerSiteResponse[];
}

export interface CaseTodoItem {
  id: string;
  label: string;
  description?: string;
  status: TodoItemStatus;
  completedAt?: string;
  completedBy?: string;
}

export interface CaseStep {
  id: string;
  name: string;
  description?: string;
  order: number;
  todos: CaseTodoItem[];
}

export interface CreateCaseBody {
  organizationId: string;
  templateId?: string;
  title: string;
  description?: string;
  priority?: CasePriority;
  /** Resolved by api-gateway from user ids */
  assignees?: CaseAssignee[];
  dueDate?: string;
  tags?: string[];
  customerId?: string;
  /** Site client sélectionné comme adresse d'intervention */
  interventionSiteId?: string;
  isTestData?: boolean;
}

export interface UpdateCaseBody {
  organizationId: string;
  title?: string;
  description?: string;
  status?: CaseStatus;
  billingStatus?: BillingStatus;
  priority?: CasePriority;
  assignees?: CaseAssignee[];
  dueDate?: string | null;
  tags?: string[];
  customerId?: string | null;
  /** Site client sélectionné comme adresse d'intervention */
  interventionSiteId?: string | null;
}

export interface CaseResponse {
  id: string;
  organizationId: string;
  templateId?: string;
  customerId?: string;
  customer?: CaseCustomerRef;
  interventionSiteId?: string;
  /** Adresse d'intervention résolue depuis le site client */
  interventionAddress?: PostalAddress;
  title: string;
  description?: string;
  status: CaseStatus;
  billingStatus: BillingStatus;
  priority: CasePriority;
  assignees: CaseAssignee[];
  dueDate?: string;
  tags: string[];
  steps: CaseStep[];
  progress: number;
  interventionCount: number;
  createdAt?: string;
  updatedAt?: string;
  isTestData?: boolean;
}

export interface CaseSummaryResponse {
  id: string;
  organizationId: string;
  customerId?: string;
  customer?: CaseCustomerRef;
  interventionSiteId?: string;
  interventionAddress?: PostalAddress;
  title: string;
  status: CaseStatus;
  billingStatus: BillingStatus;
  priority: CasePriority;
  assignees: CaseAssignee[];
  dueDate?: string;
  tags: string[];
  progress: number;
  interventionCount: number;
  nextTodo?: string;
  createdAt?: string;
  updatedAt?: string;
  isTestData?: boolean;
}

export interface CasesListResponse {
  cases: CaseSummaryResponse[];
  total: number;
}

// ── Intervention ──

export interface CreateInterventionBody {
  organizationId: string;
  caseId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  assignedTeamId?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  isTestData?: boolean;
}

export interface UpdateInterventionBody {
  organizationId: string;
  title?: string;
  description?: string;
  status?: InterventionStatus;
  billingStatus?: BillingStatus;
  assigneeId?: string | null;
  assignedTeamId?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  notes?: string;
}

export interface InterventionResponse {
  id: string;
  organizationId: string;
  caseId: string;
  caseTitle?: string;
  title: string;
  description?: string;
  status: InterventionStatus;
  billingStatus: BillingStatus;
  assigneeId?: string;
  assigneeName?: string;
  assignedTeamId?: string;
  assignedTeamName?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  startedAt?: string;
  completedAt?: string;
  startLocation?: GeoLocation;
  endLocation?: GeoLocation;
  notes?: string;
  signatoryName?: string;
  signedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  isTestData?: boolean;
}

export interface InterventionsListResponse {
  interventions: InterventionResponse[];
  total: number;
}

// ── Intervention signature ──

export interface SignInterventionBody {
  organizationId: string;
  signatoryName: string;
  /** Base64-encoded PNG data URL of the client signature. */
  signatureData: string;
}

export interface SignInterventionResponse {
  id: string;
  signatoryName: string;
  signedAt: string;
}

// ── Intervention terrain actions ──

export interface StartInterventionBody {
  organizationId: string;
  location?: GeoLocation;
}

export interface CompleteInterventionBody {
  organizationId: string;
  notes?: string;
  location?: GeoLocation;
}

export interface StartInterventionResponse {
  id: string;
  status: InterventionStatus;
  startedAt: string;
  startLocation?: GeoLocation;
}

export interface CompleteInterventionResponse {
  id: string;
  status: InterventionStatus;
  completedAt: string;
  endLocation?: GeoLocation;
}

// ── Todo actions ──

export interface UpdateTodoBody {
  organizationId: string;
  stepId: string;
  todoId: string;
  status: TodoItemStatus;
}

// ── Case history ──

export type CaseHistoryAction =
  | "case_created"
  | "case_updated"
  | "status_changed"
  | "billing_status_changed"
  | "priority_changed"
  | "assignees_changed"
  | "customer_changed"
  | "todo_updated"
  | "intervention_created"
  | "intervention_updated"
  | "intervention_deleted"
  | "intervention_started"
  | "intervention_completed"
  | "intervention_signed"
  | "document_uploaded"
  | "document_deleted"
  | "comment_added"
  | "comment_updated"
  | "comment_deleted"
  | "quote_created"
  | "quote_updated"
  | "quote_deleted"
  | "case_deleted";

export interface CaseHistoryChange {
  field: string;
  oldValue?: string;
  newValue?: string;
}

export interface CreateCaseHistoryBody {
  organizationId: string;
  caseId: string;
  actorId: string;
  actorName: string;
  action: CaseHistoryAction;
  details?: string;
  changes?: CaseHistoryChange[];
}

export interface CaseHistoryEntryResponse {
  id: string;
  organizationId: string;
  caseId: string;
  actorId: string;
  actorName: string;
  action: CaseHistoryAction;
  details?: string;
  changes?: CaseHistoryChange[];
  createdAt: string;
}

// ── Dashboard ──

export interface CaseDashboardResponse {
  assignedCases: CaseSummaryResponse[];
  upcomingInterventions: InterventionResponse[];
  overdueCases: CaseSummaryResponse[];
  todoWidgets: DashboardTodoItem[];
  stats: {
    totalAssigned: number;
    inProgress: number;
    completedThisWeek: number;
    overdue: number;
  };
}
