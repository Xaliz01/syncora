import type { UserSessionResponse } from "@planwise/shared";
import type { UserSessionDocument } from "../../persistence/user-session.schema";
import { deriveSessionDeviceClass } from "../session-label";

export function toUserSessionResponse(
  doc: UserSessionDocument,
  currentSessionId: string,
): UserSessionResponse {
  return {
    id: doc._id.toString(),
    sessionId: doc.sessionId,
    label: doc.label,
    deviceClass: doc.deviceClass ?? deriveSessionDeviceClass(doc.userAgent),
    userAgent: doc.userAgent,
    createdAt: doc.createdAt.toISOString(),
    lastSeenAt: doc.lastSeenAt.toISOString(),
    current: currentSessionId.length > 0 && doc.sessionId === currentSessionId,
  };
}
