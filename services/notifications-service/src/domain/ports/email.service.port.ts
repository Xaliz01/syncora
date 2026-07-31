import type { SendEmailNotificationResponse } from "@planwise/shared";

export abstract class AbstractEmailService {
  abstract sendNotificationEmail(
    to: string,
    subject: string,
    body: string,
    url?: string,
    ctaLabel?: string,
  ): Promise<SendEmailNotificationResponse>;

  abstract sendTransactionalEmail(
    to: string,
    subject: string,
    body: string,
    url?: string,
    ctaLabel?: string,
  ): Promise<SendEmailNotificationResponse>;

  abstract isConfigured(): boolean;
}
