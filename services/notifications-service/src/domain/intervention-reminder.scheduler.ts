import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  InterventionResponse,
  NotificationPreferencesData,
  OrganizationSubscriptionResponse,
  ReminderLeadTime,
  UserResponse,
} from "@planwise/shared";
import { buildDefaultNotificationPreferences, getEnabledChannels } from "@planwise/shared";
import type { NotificationPreferencesDocument } from "../persistence/notification-preferences.schema";
import type { NotificationDocument } from "../persistence/notification.schema";
import type { SentReminderDocument } from "../persistence/sent-reminder.schema";
import { AbstractPushSubscriptionService } from "./ports/push-subscription.service.port";
import { AbstractEmailService } from "./ports/email.service.port";
import { CronRunRecorder } from "./cron-run.recorder";

const CASES_URL = process.env.CASES_SERVICE_URL ?? "http://localhost:3004";
const USERS_URL = process.env.USERS_SERVICE_URL ?? "http://localhost:3002";
const SUBSCRIPTIONS_URL = process.env.SUBSCRIPTIONS_SERVICE_URL ?? "http://localhost:3008";
const JOB_KEY = "notifications.intervention-reminders";

@Injectable()
export class InterventionReminderScheduler {
  private readonly logger = new Logger(InterventionReminderScheduler.name);

  constructor(
    @InjectModel("NotificationPreferences")
    private readonly preferencesModel: Model<NotificationPreferencesDocument>,
    @InjectModel("Notification")
    private readonly notificationModel: Model<NotificationDocument>,
    @InjectModel("SentReminder")
    private readonly sentReminderModel: Model<SentReminderDocument>,
    private readonly pushService: AbstractPushSubscriptionService,
    private readonly emailService: AbstractEmailService,
    private readonly httpService: HttpService,
    private readonly cronRunRecorder: CronRunRecorder,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkUpcomingInterventions(): Promise<void> {
    const runId = await this.cronRunRecorder.start(JOB_KEY);
    let processed = 0;
    let succeeded = 0;
    let skipped = 0;

    try {
      const allPrefs = await this.preferencesModel.find({}).exec();
      const prefsMap = new Map<string, NotificationPreferencesData>();
      for (const p of allPrefs) {
        prefsMap.set(`${p.userId}:${p.organizationId}`, p.preferences);
      }

      const leadTimes: ReminderLeadTime[] = [15, 30, 60, 120, 1440];
      const maxLeadMinutes = Math.max(...leadTimes);

      const now = new Date();
      const windowEnd = new Date(now.getTime() + maxLeadMinutes * 60 * 1000);

      const interventions = await this.fetchUpcomingInterventions(
        now.toISOString(),
        windowEnd.toISOString(),
      );
      processed = interventions.length;

      const accessByOrganization = new Map<string, boolean>();

      for (const intervention of interventions) {
        if (!intervention.scheduledStart || !intervention.assigneeId) {
          skipped += 1;
          continue;
        }

        const orgId = intervention.organizationId;
        let hasAccess = accessByOrganization.get(orgId);
        if (hasAccess === undefined) {
          hasAccess = await this.organizationHasActiveSubscription(orgId);
          accessByOrganization.set(orgId, hasAccess);
        }
        if (!hasAccess) {
          skipped += 1;
          continue;
        }

        const scheduledStart = new Date(intervention.scheduledStart);
        const minutesUntilStart = (scheduledStart.getTime() - now.getTime()) / (60 * 1000);

        const userId = intervention.assigneeId;
        const userPrefs =
          prefsMap.get(`${userId}:${orgId}`) ?? buildDefaultNotificationPreferences();

        const userLeadTime = userPrefs.reminderLeadTime ?? 30;

        if (minutesUntilStart <= userLeadTime && minutesUntilStart > 0) {
          const alreadySent = await this.hasReminderBeenSent(intervention.id, userId, userLeadTime);
          if (alreadySent) {
            skipped += 1;
            continue;
          }

          const channels = getEnabledChannels(userPrefs, "intervention_reminder");

          if (channels.includes("in_app")) {
            await this.createReminderNotification(intervention, userId, orgId);
          }

          if (channels.includes("push")) {
            const title = "Rappel intervention";
            const body = intervention.title
              ? `Intervention « ${intervention.title} » dans ${Math.round(minutesUntilStart)} min`
              : `Intervention dans ${Math.round(minutesUntilStart)} min`;
            await this.pushService.sendPushToUser(userId, orgId, {
              title,
              body,
              url: intervention.caseId ? `/cases/${intervention.caseId}` : "/my-day",
            });
          }

          if (channels.includes("email")) {
            const emailBody = intervention.title
              ? `Intervention « ${intervention.title} » prévue dans ${Math.round(minutesUntilStart)} minutes.`
              : `Vous avez une intervention prévue dans ${Math.round(minutesUntilStart)} minutes.`;
            const userEmail = await this.resolveUserEmail(userId);
            if (userEmail) {
              await this.emailService.sendNotificationEmail(
                userEmail,
                "Rappel intervention",
                emailBody,
                intervention.caseId ? `/cases/${intervention.caseId}` : "/my-day",
              );
            }
          }

          await this.markReminderSent(intervention.id, userId, userLeadTime);
          succeeded += 1;
          this.logger.log(`Reminder sent for intervention ${intervention.id} to user ${userId}`);
        } else {
          skipped += 1;
        }
      }

      await this.cronRunRecorder.finish(runId, {
        status: "ok",
        stats: { processed, succeeded, skipped },
      });
    } catch (err) {
      const message = (err as Error).message;
      this.logger.warn("Reminder check failed", message);
      await this.cronRunRecorder.finish(runId, {
        status: "error",
        stats: { processed, succeeded, skipped },
        errorMessage: message,
      });
    }
  }

  private async hasReminderBeenSent(
    interventionId: string,
    userId: string,
    leadTime: number,
  ): Promise<boolean> {
    const existing = await this.sentReminderModel
      .findOne({ interventionId, userId, leadTime })
      .lean()
      .exec();
    return !!existing;
  }

  private async markReminderSent(
    interventionId: string,
    userId: string,
    leadTime: number,
  ): Promise<void> {
    await this.sentReminderModel
      .updateOne(
        { interventionId, userId, leadTime },
        { $setOnInsert: { interventionId, userId, leadTime } },
        { upsert: true },
      )
      .exec();
  }

  private async organizationHasActiveSubscription(organizationId: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<OrganizationSubscriptionResponse>(
          `${SUBSCRIPTIONS_URL}/subscriptions/current`,
          { params: { organizationId } },
        ),
      );
      return response.data.hasAccess;
    } catch (err) {
      this.logger.debug(
        `Reminder skipped for organization ${organizationId} (subscription check failed)`,
        (err as Error).message,
      );
      return false;
    }
  }

  private async fetchUpcomingInterventions(
    from: string,
    to: string,
  ): Promise<InterventionResponse[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<InterventionResponse[]>(`${CASES_URL}/cases/interventions/upcoming`, {
          params: { from, to },
        }),
      );
      return response.data;
    } catch {
      this.logger.debug("Could not fetch upcoming interventions");
      return [];
    }
  }

  private async createReminderNotification(
    intervention: InterventionResponse,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    await this.notificationModel.create({
      organizationId,
      userId,
      actorId: "system",
      actorName: "Planwise",
      entityType: "intervention",
      entityId: intervention.id,
      entityLabel: intervention.title,
      action: "updated",
      relatedEntityType: intervention.caseId ? "case" : undefined,
      relatedEntityId: intervention.caseId,
      detail: "Rappel : intervention imminente",
      read: false,
    });
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
