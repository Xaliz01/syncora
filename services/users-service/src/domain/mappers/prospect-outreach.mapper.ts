import type { ProspectOutreachResponse } from "@planwise/shared";
import type { ProspectOutreachDocument } from "../../persistence/prospect-outreach.schema";

export function toProspectOutreachResponse(
  doc: ProspectOutreachDocument,
): ProspectOutreachResponse {
  return {
    id: doc._id.toString(),
    siren: doc.siren,
    companyName: doc.companyName,
    email: doc.email,
    sentByUserId: doc.sentByUserId,
    sentByEmail: doc.sentByEmail,
    subject: doc.subject,
    status: doc.status,
    sentAt: doc.sentAt.toISOString(),
    ...(doc.comment?.trim() ? { comment: doc.comment } : {}),
  };
}
