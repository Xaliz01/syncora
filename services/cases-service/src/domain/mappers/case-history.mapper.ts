import type { CaseHistoryEntryResponse } from "@planwise/shared";
import type { CaseHistoryDocument } from "../../persistence/case-history.schema";

export function toHistoryResponse(doc: CaseHistoryDocument): CaseHistoryEntryResponse {
  return {
    id: doc._id.toString(),
    organizationId: doc.organizationId,
    caseId: doc.caseId,
    actorId: doc.actorId,
    actorName: doc.actorName,
    action: doc.action,
    details: doc.details,
    changes: (doc.changes ?? []).map((c) => ({
      field: c.field,
      oldValue: c.oldValue,
      newValue: c.newValue,
    })),
    createdAt: doc.get("createdAt")?.toISOString(),
  };
}
