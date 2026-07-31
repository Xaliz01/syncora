import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type { SendEmailNotificationResponse } from "@planwise/shared";
import { AbstractEmailService } from "./ports/email.service.port";

/** En local, seul ce destinataire peut recevoir des e-mails (évite les envois accidentels). */
const LOCAL_ALLOWED_RECIPIENT = "mail@benoistbabin.fr";

@Injectable()
export class EmailService extends AbstractEmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter | null;
  private readonly fromAddress: string;

  constructor() {
    super();

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    this.fromAddress = process.env.SMTP_FROM ?? "Planwise <notifications@planwise.fr>";

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`Email service configured (SMTP: ${host}:${port})`);
    } else {
      this.transporter = null;
      this.logger.warn("SMTP not configured — email notifications disabled");
    }
  }

  isConfigured(): boolean {
    return this.transporter !== null;
  }

  async sendNotificationEmail(
    to: string,
    subject: string,
    body: string,
    url?: string,
    ctaLabel?: string,
  ): Promise<SendEmailNotificationResponse> {
    return this.sendMail(to, subject, body, url, "notification", ctaLabel);
  }

  async sendTransactionalEmail(
    to: string,
    subject: string,
    body: string,
    url?: string,
    ctaLabel?: string,
  ): Promise<SendEmailNotificationResponse> {
    return this.sendMail(to, subject, body, url, "transactional", ctaLabel);
  }

  private async sendMail(
    to: string,
    subject: string,
    body: string,
    url: string | undefined,
    kind: "notification" | "transactional",
    ctaLabel?: string,
  ): Promise<SendEmailNotificationResponse> {
    if (!this.transporter) {
      return { sent: false, reason: "smtp_not_configured" };
    }

    if (!this.isRecipientAllowedInCurrentEnvironment(to)) {
      this.logger.warn(
        `Email blocked in local environment for recipient ${to} (only ${LOCAL_ALLOWED_RECIPIENT} allowed)`,
      );
      return { sent: false, reason: "local_recipient_not_allowed" };
    }

    try {
      const html = this.buildHtml(subject, body, url, kind, ctaLabel);
      await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject: `[Planwise] ${subject}`,
        text: this.buildPlainText(body, url, ctaLabel),
        html,
      });
      return { sent: true };
    } catch (err) {
      this.logger.warn(`Failed to send email to ${to}`, (err as Error).message);
      return { sent: false, reason: (err as Error).message };
    }
  }

  private isRecipientAllowedInCurrentEnvironment(to: string): boolean {
    if (process.env.NODE_ENV === "production") {
      return true;
    }
    return to.trim().toLowerCase() === LOCAL_ALLOWED_RECIPIENT;
  }

  private appBaseUrl(): string {
    return (process.env.APP_URL ?? "https://app.planwise.fr").replace(/\/$/, "");
  }

  private buildPlainText(body: string, url?: string, ctaLabel?: string): string {
    let text = body;
    if (url) {
      const label = (ctaLabel?.trim() || "Voir dans Planwise").slice(0, 80);
      text += `\n\n${label} : ${this.resolveActionUrl(url)}`;
    }
    return text;
  }

  private resolveActionUrl(url: string): string {
    const trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    return `${this.appBaseUrl()}${path}`;
  }

  private buildHtml(
    subject: string,
    body: string,
    url: string | undefined,
    kind: "notification" | "transactional",
    ctaLabel?: string,
  ): string {
    const base = this.appBaseUrl();
    const logoUrl = `${base}/planwise-logo-512.png`;
    const label = (ctaLabel?.trim() || "Voir dans Planwise").slice(0, 80);
    const linkHtml = url
      ? `<p style="margin-top:16px;"><a href="${this.resolveActionUrl(url)}" style="display:inline-block;padding:10px 20px;background-color:#4338ca;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;">${label}</a></p>`
      : "";

    const footer =
      kind === "transactional"
        ? "Cet e-mail a été envoyé dans le cadre de la création ou de la sécurisation de votre compte Planwise."
        : "Vous recevez cet email car les notifications email sont activées dans vos préférences Planwise.";

    return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f8fafc;padding:32px;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;padding:32px;">
    <div style="margin:0 0 20px;">
      <a href="${base}" style="text-decoration:none;display:inline-flex;align-items:center;gap:10px;">
        <img src="${logoUrl}" alt="Planwise" width="36" height="36" style="display:block;border:0;border-radius:8px;width:36px;height:36px;" />
        <span style="font-size:18px;font-weight:600;color:#1e293b;letter-spacing:-0.01em;">Planwise</span>
      </a>
    </div>
    <h2 style="margin:0 0 8px;color:#1e293b;font-size:18px;">${subject}</h2>
    <p style="margin:0;color:#475569;font-size:14px;line-height:1.5;white-space:pre-wrap;">${body}</p>
    ${linkHtml}
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
    <p style="margin:0;color:#94a3b8;font-size:12px;">${footer}</p>
  </div>
</body>
</html>`;
  }
}
