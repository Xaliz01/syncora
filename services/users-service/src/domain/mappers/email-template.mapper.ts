import type { PlatformEmailTemplate } from "@planwise/shared";
import type { EmailTemplateDocument } from "../../persistence/email-template.schema";

export function toPlatformEmailTemplate(doc: EmailTemplateDocument): PlatformEmailTemplate {
  const createdAt =
    (doc as EmailTemplateDocument & { createdAt?: Date }).createdAt?.toISOString() ??
    new Date(0).toISOString();
  const updatedAt =
    (doc as EmailTemplateDocument & { updatedAt?: Date }).updatedAt?.toISOString() ?? createdAt;
  return {
    id: doc._id.toString(),
    name: doc.name,
    purpose: doc.purpose,
    subject: doc.subject,
    body: doc.body,
    footer: doc.footer,
    ctaLabel: doc.ctaLabel,
    ctaUrl: doc.ctaUrl,
    isDefault: Boolean(doc.isDefault),
    createdAt,
    updatedAt,
  };
}
