import { BadRequestException, Body, Controller, Get, Post } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  SendEmailNotificationBody,
  SendEmailNotificationResponse,
  UserResponse,
} from "@planwise/shared";
import { AbstractEmailService } from "../../domain/ports/email.service.port";

const USERS_URL = process.env.USERS_SERVICE_URL ?? "http://localhost:3002";

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

  @Get("status")
  async status() {
    return { configured: this.emailService.isConfigured() };
  }

  private async resolveUserEmail(userId: string): Promise<string | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<UserResponse>(`${USERS_URL}/users/${userId}`),
      );
      return response.data.email ?? null;
    } catch {
      return null;
    }
  }
}
