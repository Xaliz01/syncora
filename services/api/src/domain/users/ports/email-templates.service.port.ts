import type {
  CreatePlatformEmailTemplateBody,
  PlatformEmailTemplate,
  PlatformEmailTemplatePurpose,
  PlatformEmailTemplatesListResponse,
  UpdatePlatformEmailTemplateBody,
} from "@planwise/shared";

export abstract class AbstractEmailTemplatesService {
  abstract list(options?: {
    purpose?: PlatformEmailTemplatePurpose;
  }): Promise<PlatformEmailTemplatesListResponse>;

  abstract getById(id: string): Promise<PlatformEmailTemplate>;

  abstract create(body: CreatePlatformEmailTemplateBody): Promise<PlatformEmailTemplate>;

  abstract update(
    id: string,
    body: UpdatePlatformEmailTemplateBody,
  ): Promise<PlatformEmailTemplate>;

  abstract remove(id: string): Promise<{ ok: true }>;

  abstract setDefault(id: string): Promise<PlatformEmailTemplate>;
}
