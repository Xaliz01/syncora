import type { CopilotSessionResponse } from "@planwise/shared";
import type { CopilotSessionDocument } from "../../persistence/organizations/copilot-session.schema";

export function toCopilotSessionResponse(
  doc: CopilotSessionDocument,
  quotaRemaining?: number,
): CopilotSessionResponse {
  const createdAt = doc.get("createdAt") as Date | undefined;
  const updatedAt = doc.get("updatedAt") as Date | undefined;
  return {
    id: doc._id.toString(),
    organizationId: doc.organizationId,
    userId: doc.userId,
    userName: doc.userName,
    createdAt: createdAt?.toISOString?.() ?? new Date(0).toISOString(),
    updatedAt: updatedAt?.toISOString?.(),
    transcript: doc.transcript,
    audioAvailable: doc.audioAvailable === true,
    intent: doc.intent,
    status: doc.status,
    decision: doc.decision ?? null,
    message: doc.message,
    actions: doc.actions ?? [],
    approxTokens: doc.approxTokens,
    ...(quotaRemaining != null ? { quotaRemaining } : {}),
  };
}
