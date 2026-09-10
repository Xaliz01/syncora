import type {
  PreviewTransactionalEmailResponse,
  SendEmailNotificationResponse,
  TransactionalEmailSendOptions,
} from "@planwise/shared";

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
    footer?: string,
    options?: TransactionalEmailSendOptions,
  ): Promise<SendEmailNotificationResponse>;

  abstract previewTransactionalEmail(
    subject: string,
    body: string,
    url?: string,
    ctaLabel?: string,
    footer?: string,
  ): PreviewTransactionalEmailResponse;

  abstract isConfigured(): boolean;
}
