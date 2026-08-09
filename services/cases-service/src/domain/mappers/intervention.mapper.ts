import type { InterventionResponse } from "@planwise/shared";
import type { InterventionDocument } from "../../persistence/intervention.schema";

export function toInterventionResponse(
  doc: InterventionDocument,
  caseTitle?: string,
): InterventionResponse {
  return {
    id: doc._id.toString(),
    organizationId: doc.organizationId,
    caseId: doc.caseId,
    caseTitle,
    title: doc.title,
    description: doc.description,
    status: doc.status,
    billingStatus: doc.billingStatus ?? "none",
    assigneeId: doc.assigneeId,
    assigneeName: doc.assigneeName,
    assignedTeamId: doc.assignedTeamId,
    assignedTeamName: doc.assignedTeamName,
    typeId: doc.typeId,
    typeName: doc.typeName,
    typeColor: doc.typeColor,
    scheduledStart: doc.scheduledStart?.toISOString(),
    scheduledEnd: doc.scheduledEnd?.toISOString(),
    startedAt: doc.startedAt?.toISOString(),
    completedAt: doc.completedAt?.toISOString(),
    startLocation: doc.startLocation,
    endLocation: doc.endLocation,
    notes: doc.notes,
    signatoryName: doc.signatoryName,
    signedAt: doc.signedAt?.toISOString(),
    createdAt: doc.get("createdAt")?.toISOString(),
    updatedAt: doc.get("updatedAt")?.toISOString(),
    isTestData: doc.isTestData === true,
  };
}
