import type { ProspectOutreachResponse } from "@planwise/shared";
import type { ProspectOutreachDocument } from "../../persistence/prospect-outreach.schema";

function toIso(value: Date | string | undefined): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  return value;
}

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
    emailSends: (doc.emailSends ?? []).map((entry) => ({
      sentAt: toIso(entry.sentAt),
      subject: entry.subject,
      toEmail: entry.toEmail,
      sentByUserId: entry.sentByUserId,
      sentByEmail: entry.sentByEmail,
      status: entry.status,
      ...(entry.templateId ? { templateId: entry.templateId } : {}),
      ...(entry.templateName ? { templateName: entry.templateName } : {}),
    })),
    ...(doc.comment?.trim() ? { comment: doc.comment } : {}),
  };
}
