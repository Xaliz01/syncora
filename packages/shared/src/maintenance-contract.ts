/** Contrats de maintenance récurrents (vision 5.1) — artisans & TPE. */

export const MAINTENANCE_CONTRACT_STATUSES = ["draft", "active", "suspended", "ended"] as const;

export type MaintenanceContractStatus = (typeof MAINTENANCE_CONTRACT_STATUSES)[number];

/** Mode de planification des visites. */
export const MAINTENANCE_SCHEDULING_MODES = ["schedule_with_client", "auto_plan"] as const;

export type MaintenanceSchedulingMode = (typeof MAINTENANCE_SCHEDULING_MODES)[number];

export const MAINTENANCE_SCHEDULING_MODE_LABELS: Record<MaintenanceSchedulingMode, string> = {
  schedule_with_client: "À programmer avec le client",
  auto_plan: "Auto-planifier à l’échéance",
};

/** Délais de rappel avant échéance (jours). */
export const MAINTENANCE_REMIND_BEFORE_DAYS = [7, 14, 30] as const;

export type MaintenanceRemindBeforeDays = (typeof MAINTENANCE_REMIND_BEFORE_DAYS)[number];

export const DEFAULT_MAINTENANCE_SCHEDULING_MODE: MaintenanceSchedulingMode =
  "schedule_with_client";
export const DEFAULT_MAINTENANCE_REMIND_BEFORE_DAYS: MaintenanceRemindBeforeDays = 14;

/** Une visite générée depuis le contrat (dossier + intervention). */
export interface MaintenanceContractVisitHistoryEntry {
  caseId: string;
  interventionId: string;
  /** Échéance couverte par cette génération (AAAA-MM-JJ). */
  dueDate: string;
  generatedAt: string;
}

export interface MaintenanceContractResponse {
  id: string;
  organizationId: string;
  customerId: string;
  /** Site client pour l’adresse d’intervention (optionnel). */
  siteId?: string;
  /** Modèle de dossier appliqué à chaque visite générée (optionnel). */
  templateId?: string;
  title: string;
  description?: string;
  status: MaintenanceContractStatus;
  /** Date de début du contrat (ISO date ou datetime). */
  startDate: string;
  /** Fin optionnelle ; au-delà, plus de génération. */
  endDate?: string;
  /** Visite tous les N mois (min 1). */
  recurrenceMonths: number;
  /** Prochaine échéance de génération. */
  nextDueDate: string;
  schedulingMode: MaintenanceSchedulingMode;
  remindBeforeDays: MaintenanceRemindBeforeDays;
  /** Contrat dans la file « à programmer » (mode schedule_with_client). */
  schedulingPending: boolean;
  /** Échéance pour laquelle un rappel a déjà été envoyé (dédup). */
  reminderSentForDueDate?: string;
  defaultAssigneeId?: string;
  defaultTeamId?: string;
  lastGeneratedAt?: string;
  lastGeneratedCaseId?: string;
  lastGeneratedInterventionId?: string;
  /** Historique complet des visites générées (plus récent en premier). */
  visitHistory: MaintenanceContractVisitHistoryEntry[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceContractsListResponse {
  contracts: MaintenanceContractResponse[];
  total: number;
}

/** Élément dashboard « Visites à programmer ». */
export interface DashboardMaintenanceVisitItem {
  contractId: string;
  title: string;
  customerId: string;
  customerName?: string;
  nextDueDate: string;
  overdue: boolean;
  remindBeforeDays: MaintenanceRemindBeforeDays;
}

export interface CreateMaintenanceContractBody {
  organizationId: string;
  customerId: string;
  siteId?: string;
  templateId?: string;
  title: string;
  description?: string;
  status?: MaintenanceContractStatus;
  startDate: string;
  endDate?: string;
  recurrenceMonths: number;
  /** Défaut : startDate. */
  nextDueDate?: string;
  schedulingMode?: MaintenanceSchedulingMode;
  remindBeforeDays?: MaintenanceRemindBeforeDays;
  defaultAssigneeId?: string;
  defaultTeamId?: string;
  notes?: string;
}

export interface UpdateMaintenanceContractBody {
  organizationId: string;
  customerId?: string;
  siteId?: string | null;
  templateId?: string | null;
  title?: string;
  description?: string | null;
  status?: MaintenanceContractStatus;
  startDate?: string;
  endDate?: string | null;
  recurrenceMonths?: number;
  nextDueDate?: string;
  schedulingMode?: MaintenanceSchedulingMode;
  remindBeforeDays?: MaintenanceRemindBeforeDays;
  defaultAssigneeId?: string | null;
  defaultTeamId?: string | null;
  notes?: string | null;
}

export interface ScheduleMaintenanceVisitBody {
  organizationId: string;
  scheduledStart: string;
  scheduledEnd: string;
}

export interface GenerateMaintenanceVisitResponse {
  contract: MaintenanceContractResponse;
  caseId: string;
  interventionId: string;
}

export function parseMaintenanceSchedulingMode(
  raw: string | undefined | null,
): MaintenanceSchedulingMode {
  if (raw && (MAINTENANCE_SCHEDULING_MODES as readonly string[]).includes(raw)) {
    return raw as MaintenanceSchedulingMode;
  }
  return DEFAULT_MAINTENANCE_SCHEDULING_MODE;
}

export function parseMaintenanceRemindBeforeDays(
  raw: number | string | undefined | null,
): MaintenanceRemindBeforeDays {
  const n = typeof raw === "string" ? Number(raw) : raw;
  if (
    typeof n === "number" &&
    Number.isFinite(n) &&
    (MAINTENANCE_REMIND_BEFORE_DAYS as readonly number[]).includes(n)
  ) {
    return n as MaintenanceRemindBeforeDays;
  }
  return DEFAULT_MAINTENANCE_REMIND_BEFORE_DAYS;
}
