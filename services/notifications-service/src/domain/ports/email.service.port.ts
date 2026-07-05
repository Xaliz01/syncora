import type { SendEmailNotificationResponse } from "@planwise/shared";

export abstract class AbstractEmailService {
  abstract sendNotificationEmail(
    to: string,
    subject: string,
    body: string,
    url?: string,
  ): Promise<SendEmailNotificationResponse>;

  abstract isConfigured(): boolean;
}
