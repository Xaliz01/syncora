import type {
  CreatePlatformEmailTemplateBody,
  PlatformEmailTemplate,
  PlatformEmailTemplatePreviewBody,
  PlatformEmailTemplatePreviewResponse,
  PlatformEmailTemplatePurpose,
  PlatformEmailTemplatesListResponse,
  UpdatePlatformEmailTemplateBody,
} from "@planwise/shared";

export abstract class AbstractPlatformEmailTemplatesService {
  abstract listEmailTemplates(
    purpose?: PlatformEmailTemplatePurpose,
  ): Promise<PlatformEmailTemplatesListResponse>;
  abstract getEmailTemplate(id: string): Promise<PlatformEmailTemplate>;
  abstract createEmailTemplate(
    body: CreatePlatformEmailTemplateBody,
  ): Promise<PlatformEmailTemplate>;
  abstract updateEmailTemplate(
    id: string,
    body: UpdatePlatformEmailTemplateBody,
  ): Promise<PlatformEmailTemplate>;
  abstract deleteEmailTemplate(id: string): Promise<{ ok: true }>;
  abstract setDefaultEmailTemplate(id: string): Promise<PlatformEmailTemplate>;
  abstract previewEmailTemplate(
    body: PlatformEmailTemplatePreviewBody,
  ): Promise<PlatformEmailTemplatePreviewResponse>;
}
