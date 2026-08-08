import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  MaintenanceContractResponse,
  NotificationPreferencesData,
  OrganizationSubscriptionResponse,
  UserResponse,
} from "@planwise/shared";
import {
  buildDefaultNotificationPreferences,
  getEnabledChannels,
  withNotificationOrganizationId,
} from "@planwise/shared";
import type { NotificationPreferencesDocument } from "../persistence/notification-preferences.schema";
import type { NotificationDocument } from "../persistence/notification.schema";
import { AbstractPushSubscriptionService } from "./ports/push-subscription.service.port";
import { AbstractEmailService } from "./ports/email.service.port";
import { CronRunRecorder } from "./cron-run.recorder";
import { SERVICE_URLS } from "../infrastructure/service-urls.config";
const JOB_KEY = "notifications.maintenance-visit-reminders";

@Injectable()
export class MaintenanceVisitReminderScheduler {
  private readonly logger = new Logger(MaintenanceVisitReminderScheduler.name);

  constructor(
    @InjectModel("NotificationPreferences")
    private readonly preferencesModel: Model<NotificationPreferencesDocument>,
    @InjectModel("Notification")
    private readonly notificationModel: Model<NotificationDocument>,
    private readonly pushService: AbstractPushSubscriptionService,
    private readonly emailService: AbstractEmailService,
    private readonly httpService: HttpService,
    private readonly cronRunRecorder: CronRunRecorder,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async checkMaintenanceVisitReminders(): Promise<void> {
    const runId = await this.cronRunRecorder.start(JOB_KEY);
    let processed = 0;
    let succeeded = 0;
    let skipped = 0;
    let failed = 0;

    try {
      const contracts = await this.fetchReminderCandidates();
      processed = contracts.length;

      const allPrefs = await this.preferencesModel.find({}).exec();
      const prefsMap = new Map<string, NotificationPreferencesData>();
      for (const p of allPrefs) {
        prefsMap.set(`${p.userId}:${p.organizationId}`, p.preferences);
      }

      const accessByOrganization = new Map<string, boolean>();
      const usersByOrganization = new Map<string, string[]>();

      for (const contract of contracts) {
        const orgId = contract.organizationId;
        try {
          let hasAccess = accessByOrganization.get(orgId);
          if (hasAccess === undefined) {
            hasAccess = await this.organizationHasActiveSubscription(orgId);
            accessByOrganization.set(orgId, hasAccess);
          }
          if (!hasAccess) {
            skipped += 1;
            continue;
          }

          let userIds = usersByOrganization.get(orgId);
          if (!userIds) {
            userIds = await this.getOrganizationUserIds(orgId);
            usersByOrganization.set(orgId, userIds);
          }
          if (userIds.length === 0) {
            skipped += 1;
            continue;
          }

          const detail = "Visite en approche — à programmer avec le client";
          const deepLink = withNotificationOrganizationId(`/contracts/${contract.id}`, orgId);
          const title = "Visite de maintenance à programmer";
          const bodyText = `Le contrat « ${contract.title} » arrive à échéance le ${contract.nextDueDate}.`;

          let notifiedAnyone = false;
          for (const userId of userIds) {
            const userPrefs =
              prefsMap.get(`${userId}:${orgId}`) ?? buildDefaultNotificationPreferences();
            const channels = getEnabledChannels(userPrefs, "maintenance_visit_reminder");
            if (channels.length === 0) continue;

            if (channels.includes("in_app")) {
              await this.notificationModel.create({
                organizationId: orgId,
                userId,
                actorId: "system",
                actorName: "Planwise",
                entityType: "maintenance_contract",
                entityId: contract.id,
                entityLabel: contract.title,
                action: "updated",
                detail,
                read: false,
              });
            }

            if (channels.includes("push")) {
              await this.pushService.sendPushToUser(userId, orgId, {
                title,
                body: bodyText,
                url: deepLink,
              });
            }

            if (channels.includes("email")) {
              const userEmail = await this.resolveUserEmail(userId);
              if (userEmail) {
                await this.emailService.sendNotificationEmail(
                  userEmail,
                  title,
                  `${bodyText} ${detail}`,
                  deepLink,
                );
              }
            }
            notifiedAnyone = true;
          }

          if (notifiedAnyone) {
            await this.markReminded(orgId, contract.id);
            succeeded += 1;
            this.logger.log(`Maintenance visit reminder sent for contract ${contract.id}`);
          } else {
            skipped += 1;
          }
        } catch (err) {
          failed += 1;
          this.logger.warn(
            `Failed maintenance visit reminder for contract ${contract.id}`,
            (err as Error).message,
          );
        }
      }

      await this.cronRunRecorder.finish(runId, {
        status: "ok",
        stats: { processed, succeeded, skipped, failed },
      });
    } catch (err) {
      const message = (err as Error).message;
      this.logger.warn("Maintenance visit reminder check failed", message);
      await this.cronRunRecorder.finish(runId, {
        status: "error",
        stats: { processed, succeeded, skipped, failed },
        errorMessage: message,
      });
    }
  }

  private async fetchReminderCandidates(): Promise<MaintenanceContractResponse[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<MaintenanceContractResponse[]>(
          `${SERVICE_URLS.cases}/maintenance-contracts/reminder-candidates`,
        ),
      );
      return Array.isArray(response.data) ? response.data : [];
    } catch {
      this.logger.debug("Could not fetch maintenance reminder candidates");
      return [];
    }
  }

  private async markReminded(organizationId: string, contractId: string): Promise<void> {
    await firstValueFrom(
      this.httpService.post(
        `${SERVICE_URLS.cases}/maintenance-contracts/${contractId}/mark-reminded`,
        {},
        { params: { organizationId } },
      ),
    );
  }

  private async getOrganizationUserIds(organizationId: string): Promise<string[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<UserResponse[]>(`${SERVICE_URLS.users}/users`, {
          params: { organizationId },
        }),
      );
      return (response.data ?? []).map((u) => u.id).filter(Boolean);
    } catch {
      return [];
    }
  }

  private async organizationHasActiveSubscription(organizationId: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<OrganizationSubscriptionResponse>(
          `${SERVICE_URLS.subscriptions}/subscriptions/current`,
          { params: { organizationId } },
        ),
      );
      return response.data.hasAccess;
    } catch {
      return false;
    }
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
