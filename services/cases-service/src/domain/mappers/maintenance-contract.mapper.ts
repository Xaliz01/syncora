import type {
  DashboardMaintenanceVisitItem,
  MaintenanceContractResponse,
  MaintenanceRemindBeforeDays,
  MaintenanceSchedulingMode,
} from "@planwise/shared";
import { parseMaintenanceRemindBeforeDays, parseMaintenanceSchedulingMode } from "@planwise/shared";
import type { MaintenanceContractDocument } from "../../persistence/maintenance-contract.schema";

function resolveSchedulingMode(doc: MaintenanceContractDocument): MaintenanceSchedulingMode {
  return parseMaintenanceSchedulingMode(doc.schedulingMode);
}

function resolveRemindBeforeDays(doc: MaintenanceContractDocument): MaintenanceRemindBeforeDays {
  return parseMaintenanceRemindBeforeDays(doc.remindBeforeDays);
}

function resolveVisitHistory(
  doc: MaintenanceContractDocument,
): MaintenanceContractResponse["visitHistory"] {
  const stored = doc.visitHistory ?? [];
  if (stored.length > 0) {
    return stored.map((entry) => ({
      caseId: entry.caseId,
      interventionId: entry.interventionId,
      dueDate: entry.dueDate,
      generatedAt: entry.generatedAt,
    }));
  }
  if (doc.lastGeneratedCaseId && doc.lastGeneratedInterventionId && doc.lastGeneratedAt) {
    return [
      {
        caseId: doc.lastGeneratedCaseId,
        interventionId: doc.lastGeneratedInterventionId,
        dueDate: doc.lastGeneratedAt.slice(0, 10),
        generatedAt: doc.lastGeneratedAt,
      },
    ];
  }
  return [];
}

export function toMaintenanceContractResponse(
  doc: MaintenanceContractDocument,
): MaintenanceContractResponse {
  const visitHistory = resolveVisitHistory(doc);
  return {
    id: doc._id.toString(),
    organizationId: doc.organizationId,
    customerId: doc.customerId,
    siteId: doc.siteId,
    templateId: doc.templateId,
    title: doc.title,
    description: doc.description,
    status: doc.status,
    startDate: doc.startDate,
    endDate: doc.endDate,
    recurrenceMonths: doc.recurrenceMonths,
    nextDueDate: doc.nextDueDate,
    schedulingMode: resolveSchedulingMode(doc),
    remindBeforeDays: resolveRemindBeforeDays(doc),
    schedulingPending: doc.schedulingPending === true,
    reminderSentForDueDate: doc.reminderSentForDueDate,
    defaultAssigneeId: doc.defaultAssigneeId,
    defaultTeamId: doc.defaultTeamId,
    lastGeneratedAt: doc.lastGeneratedAt,
    lastGeneratedCaseId: doc.lastGeneratedCaseId,
    lastGeneratedInterventionId: doc.lastGeneratedInterventionId,
    visitHistory,
    notes: doc.notes,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export function toDashboardMaintenanceVisitItem(
  doc: MaintenanceContractDocument,
  today: string,
): DashboardMaintenanceVisitItem {
  return {
    contractId: doc._id.toString(),
    title: doc.title,
    customerId: doc.customerId,
    nextDueDate: doc.nextDueDate,
    overdue: doc.nextDueDate < today,
    remindBeforeDays: resolveRemindBeforeDays(doc),
  };
}
