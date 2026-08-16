import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  CreatePlatformEmailTemplateBody,
  PlatformEmailTemplate,
  PlatformEmailTemplatePreviewBody,
  PlatformEmailTemplatePreviewResponse,
  PlatformEmailTemplatePurpose,
  PlatformEmailTemplatesListResponse,
  UpdatePlatformEmailTemplateBody,
} from "@planwise/shared";
import { interpolateEmailTemplatePlaceholders } from "@planwise/shared";
import { AbstractPlatformEmailTemplatesService } from "../ports/platform/platform-email-templates.service.port";
import { APP_PUBLIC_URL } from "./platform.constants";
import { SERVICE_URLS } from "../../infrastructure/service-urls.config";

@Injectable()
export class PlatformEmailTemplatesService extends AbstractPlatformEmailTemplatesService {
  private readonly logger = new Logger(PlatformEmailTemplatesService.name);

  constructor(private readonly httpService: HttpService) {
    super();
  }

  async listEmailTemplates(purpose?: PlatformEmailTemplatePurpose) {
    try {
      const res = await firstValueFrom(
        this.httpService.get<PlatformEmailTemplatesListResponse>(
          `${SERVICE_URLS.users}/users/platform/email-templates`,
          { params: purpose ? { purpose } : undefined, timeout: 10_000 },
        ),
      );
      return res.data;
    } catch (err: unknown) {
      this.logger.warn(`Failed to list email templates: ${(err as Error).message}`);
      throw new ServiceUnavailableException("Impossible de charger les contenus e-mail");
    }
  }

  async getEmailTemplate(id: string): Promise<PlatformEmailTemplate> {
    try {
      const res = await firstValueFrom(
        this.httpService.get<PlatformEmailTemplate>(
          `${SERVICE_URLS.users}/users/platform/email-templates/${encodeURIComponent(id)}`,
          { timeout: 10_000 },
        ),
      );
      return res.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) throw new NotFoundException("Contenu e-mail introuvable");
      this.logger.warn(`Failed to get email template: ${(err as Error).message}`);
      throw new ServiceUnavailableException("Impossible de charger le contenu e-mail");
    }
  }

  async createEmailTemplate(body: CreatePlatformEmailTemplateBody): Promise<PlatformEmailTemplate> {
    try {
      const res = await firstValueFrom(
        this.httpService.post<PlatformEmailTemplate>(
          `${SERVICE_URLS.users}/users/platform/email-templates`,
          body,
          { timeout: 10_000 },
        ),
      );
      return res.data;
    } catch (err: unknown) {
      this.rethrowUsersClientError(err, "Impossible de créer le contenu e-mail");
    }
  }

  async updateEmailTemplate(
    id: string,
    body: UpdatePlatformEmailTemplateBody,
  ): Promise<PlatformEmailTemplate> {
    try {
      const res = await firstValueFrom(
        this.httpService.patch<PlatformEmailTemplate>(
          `${SERVICE_URLS.users}/users/platform/email-templates/${encodeURIComponent(id)}`,
          body,
          { timeout: 10_000 },
        ),
      );
      return res.data;
    } catch (err: unknown) {
      this.rethrowUsersClientError(err, "Impossible de mettre à jour le contenu e-mail");
    }
  }

  async deleteEmailTemplate(id: string): Promise<{ ok: true }> {
    try {
      const res = await firstValueFrom(
        this.httpService.delete<{ ok: true }>(
          `${SERVICE_URLS.users}/users/platform/email-templates/${encodeURIComponent(id)}`,
          { timeout: 10_000 },
        ),
      );
      return res.data;
    } catch (err: unknown) {
      this.rethrowUsersClientError(err, "Impossible de supprimer le contenu e-mail");
    }
  }

  async setDefaultEmailTemplate(id: string): Promise<PlatformEmailTemplate> {
    try {
      const res = await firstValueFrom(
        this.httpService.post<PlatformEmailTemplate>(
          `${SERVICE_URLS.users}/users/platform/email-templates/${encodeURIComponent(id)}/set-default`,
          {},
          { timeout: 10_000 },
        ),
      );
      return res.data;
    } catch (err: unknown) {
      this.rethrowUsersClientError(err, "Impossible de définir le contenu par défaut");
    }
  }

  async previewEmailTemplate(
    body: PlatformEmailTemplatePreviewBody,
  ): Promise<PlatformEmailTemplatePreviewResponse> {
    let subject = body.subject?.trim() ?? "";
    let emailBody = body.body ?? "";
    let footer = body.footer ?? "";
    let ctaLabel = body.ctaLabel?.trim() || "Découvrir Planwise";
    let ctaUrl = body.ctaUrl?.trim() || "/";

    if (body.templateId?.trim()) {
      const template = await this.getEmailTemplate(body.templateId.trim());
      subject = template.subject;
      emailBody = template.body;
      footer = template.footer;
      ctaLabel = template.ctaLabel;
      ctaUrl = template.ctaUrl;
    }
    if (!subject) {
      throw new BadRequestException("Sujet requis pour l’aperçu");
    }

    const landingUrl = APP_PUBLIC_URL.replace(/\/$/, "") || "https://planwise.fr";
    const placeholders = {
      contactName: body.contactName?.trim() || "Jean Dupont",
      companyName: body.companyName?.trim() || "Entreprise exemple",
      landingUrl,
    };
    const interpolatedSubject = interpolateEmailTemplatePlaceholders(subject, placeholders);
    const interpolatedBody = interpolateEmailTemplatePlaceholders(emailBody, placeholders);
    const interpolatedFooter = interpolateEmailTemplatePlaceholders(footer, placeholders);

    try {
      const res = await firstValueFrom(
        this.httpService.post<{ html: string; text: string; subject: string }>(
          `${SERVICE_URLS.notifications}/email/preview`,
          {
            subject: interpolatedSubject,
            body: interpolatedBody,
            url: ctaUrl,
            ctaLabel,
            footer: interpolatedFooter,
          },
          { timeout: 10_000 },
        ),
      );
      return {
        html: res.data.html,
        text: res.data.text,
        subject: res.data.subject,
      };
    } catch (err: unknown) {
      this.logger.warn(`Email preview failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException("Impossible de générer l’aperçu");
    }
  }

  rethrowUsersClientError(err: unknown, fallback: string): never {
    const axiosErr = err as {
      response?: { status?: number; data?: { message?: string | string[] } };
      message?: string;
    };
    const status = axiosErr.response?.status;
    const raw = axiosErr.response?.data?.message;
    const message = Array.isArray(raw) ? raw.join(", ") : raw || axiosErr.message || fallback;
    if (status === 400) throw new BadRequestException(message);
    if (status === 404) throw new NotFoundException(message);
    if (status === 409) throw new ConflictException(message);
    this.logger.warn(`${fallback}: ${message}`);
    throw new ServiceUnavailableException(fallback);
  }
}
