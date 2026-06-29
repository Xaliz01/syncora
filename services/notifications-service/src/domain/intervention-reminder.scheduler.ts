import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  InterventionResponse,
  NotificationPreferencesData,
  ReminderLeadTime,
} from "@planwise/shared";
import { buildDefaultNotificationPreferences, getEnabledChannels } from "@planwise/shared";
import type { NotificationPreferencesDocument } from "../persistence/notification-preferences.schema";
import type { NotificationDocument } from "../persistence/notification.schema";
import { AbstractPushSubscriptionService } from "./ports/push-subscription.service.port";

const CASES_URL = process.env.CASES_SERVICE_URL ?? "http://localhost:3004";

@Injectable()
export class InterventionReminderScheduler {
  private readonly logger = new Logger(InterventionReminderScheduler.name);
  private readonly sentReminders = new Map<string, number>();

  constructor(
    @InjectModel("NotificationPreferences")
    private readonly preferencesModel: Model<NotificationPreferencesDocument>,
    @InjectModel("Notification")
    private readonly notificationModel: Model<NotificationDocument>,
    private readonly pushService: AbstractPushSubscriptionService,
    private readonly httpService: HttpService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async checkUpcomingInterventions(): Promise<void> {
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

      for (const intervention of interventions) {
        if (!intervention.scheduledStart || !intervention.assigneeId) continue;

        const scheduledStart = new Date(intervention.scheduledStart);
        const minutesUntilStart = (scheduledStart.getTime() - now.getTime()) / (60 * 1000);

        const userId = intervention.assigneeId;
        const orgId = intervention.organizationId;
        const userPrefs =
          prefsMap.get(`${userId}:${orgId}`) ?? buildDefaultNotificationPreferences();

        const userLeadTime = userPrefs.reminderLeadTime ?? 30;

        if (minutesUntilStart <= userLeadTime && minutesUntilStart > 0) {
          const reminderKey = `${intervention.id}:${userId}:${userLeadTime}`;
          if (this.sentReminders.has(reminderKey)) continue;

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

          this.sentReminders.set(reminderKey, Date.now());
          this.logger.log(`Reminder sent for intervention ${intervention.id} to user ${userId}`);
        }
      }

      this.cleanupOldReminders();
    } catch (err) {
      this.logger.warn("Reminder check failed", (err as Error).message);
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
      this.logger.debug("Could not fetch upcoming interventions (endpoint may not exist yet)");
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

  private cleanupOldReminders(): void {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    for (const [key, timestamp] of this.sentReminders) {
      if (timestamp < twoHoursAgo) {
        this.sentReminders.delete(key);
      }
    }
  }
}
