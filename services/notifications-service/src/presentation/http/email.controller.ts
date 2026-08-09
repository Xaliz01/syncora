import { BadRequestException, Body, Controller, Get, Post } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  PreviewTransactionalEmailBody,
  PreviewTransactionalEmailResponse,
  SendEmailNotificationBody,
  SendEmailNotificationResponse,
  SendTransactionalEmailBody,
  UserResponse,
} from "@planwise/shared";
import { AbstractEmailService } from "../../domain/ports/email.service.port";
import { SERVICE_URLS } from "../../infrastructure/service-urls.config";

@Controller("email")
export class EmailController {
  constructor(
    private readonly emailService: AbstractEmailService,
    private readonly httpService: HttpService,
  ) {}

  @Post("send")
  async sendEmail(@Body() body: SendEmailNotificationBody): Promise<SendEmailNotificationResponse> {
    if (!body.userId || !body.organizationId || !body.subject) {
      throw new BadRequestException("userId, organizationId, and subject are required");
    }

    if (!this.emailService.isConfigured()) {
      return { sent: false, reason: "smtp_not_configured" };
    }

    const email = await this.resolveUserEmail(body.userId);
    if (!email) {
      return { sent: false, reason: "user_email_not_found" };
    }

    return this.emailService.sendNotificationEmail(email, body.subject, body.body, body.url);
  }

  @Post("transactional")
  async sendTransactional(
    @Body() body: SendTransactionalEmailBody,
  ): Promise<SendEmailNotificationResponse> {
    if (!body.to?.trim() || !body.subject?.trim()) {
      throw new BadRequestException("to and subject are required");
    }

    if (!this.emailService.isConfigured()) {
      return { sent: false, reason: "smtp_not_configured" };
    }

    return this.emailService.sendTransactionalEmail(
      body.to.trim(),
      body.subject,
      body.body ?? "",
      body.url,
      body.ctaLabel,
      body.footer,
    );
  }

  @Post("preview")
  previewTransactional(
    @Body() body: PreviewTransactionalEmailBody,
  ): PreviewTransactionalEmailResponse {
    if (!body.subject?.trim()) {
      throw new BadRequestException("subject is required");
    }
    return this.emailService.previewTransactionalEmail(
      body.subject,
      body.body ?? "",
      body.url,
      body.ctaLabel,
      body.footer,
    );
  }

  @Get("status")
  async status() {
    return { configured: this.emailService.isConfigured() };
  }

  private async resolveUserEmail(userId: string): Promise<string | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<UserResponse>(`${SERVICE_URLS.users}/users/${userId}`),
      );
      return response.data.email ?? null;
    } catch {
      return null;
    }
  }
}
