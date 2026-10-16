import type { NotificationEntityType } from "@planwise/shared";

const INTERVENTION_STATUS_LABELS: Record<string, string> = {
  planned: "planifiée",
  in_progress: "en cours",
  completed: "terminée",
  cancelled: "annulée",
};

const DOCUMENT_ENTITY_TO_NOTIFICATION: Record<string, NotificationEntityType> = {
  case: "case",
  customer: "customer",
  vehicle: "vehicle",
  team: "team",
  technician: "technician",
  organization: "organization",
};

export function mapDocumentEntityType(entityType: string): NotificationEntityType | undefined {
  return DOCUMENT_ENTITY_TO_NOTIFICATION[entityType];
}

export function buildInterventionUpdateDetail(body: Record<string, unknown>): string | undefined {
  const parts: string[] = [];

  if ("title" in body) parts.push("titre modifié");
  if ("description" in body) parts.push("description modifiée");
  if ("status" in body && body.status) {
    const status = String(body.status);
    parts.push(`statut : ${INTERVENTION_STATUS_LABELS[status] ?? status}`);
  }
  if ("assigneeId" in body) {
    parts.push(body.assigneeId ? "intervenant assigné" : "intervenant retiré");
  }
  if ("assignedTeamId" in body) {
    parts.push(body.assignedTeamId ? "équipe assignée" : "équipe retirée");
  }
  if ("scheduledStart" in body) parts.push("planning modifié");
  if ("scheduledEnd" in body) parts.push("fin planifiée modifiée");
  if ("notes" in body) parts.push("notes modifiées");

  return parts.length > 0 ? parts.join(", ") : undefined;
}
