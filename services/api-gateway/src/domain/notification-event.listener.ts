import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type { PlanwiseDomainEvent } from "../infrastructure/notify.interceptor";
import type {
  CreateNotificationBody,
  NotificationEntityType,
  NotificationAction,
  NotificationEventType,
  NotificationPreferencesResponse,
  UserResponse,
} from "@planwise/shared";
import { getEnabledChannels } from "@planwise/shared";

const USERS_URL = process.env.USERS_SERVICE_URL ?? "http://localhost:3002";
const NOTIFICATIONS_URL = process.env.NOTIFICATIONS_SERVICE_URL ?? "http://localhost:3010";

@Injectable()
export class NotificationEventListener {
  private readonly logger = new Logger(NotificationEventListener.name);

  constructor(private readonly httpService: HttpService) {}

  @OnEvent("planwise.entity.changed", { async: true })
  async handleEntityChanged(event: PlanwiseDomainEvent): Promise<void> {
    try {
      const userIds = await this.getOrganizationUserIds(event.organizationId);
      if (userIds.length === 0) return;

      const body: CreateNotificationBody & { userIds: string[] } = {
        organizationId: event.organizationId,
        actorId: event.actorId,
        actorName: event.actorName,
        entityType: event.entityType as NotificationEntityType,
        entityId: event.entityId,
        entityLabel: event.entityLabel,
        action: event.action as NotificationAction,
        relatedEntityType: event.relatedEntityType,
        relatedEntityId: event.relatedEntityId,
        relatedEntityLabel: event.relatedEntityLabel,
        detail: event.detail,
        userIds,
      };

      await firstValueFrom(this.httpService.post(`${NOTIFICATIONS_URL}/notifications`, body));

      const eventType = this.mapToNotificationEventType(event);
      if (eventType) {
        await this.sendPushNotifications(event, userIds, eventType);
      }
    } catch (err) {
      this.logger.warn(
        `Failed to create notifications for ${event.entityType}:${event.entityId}`,
        (err as Error).message,
      );
    }
  }

  private mapToNotificationEventType(event: PlanwiseDomainEvent): NotificationEventType | null {
    if (event.entityType === "intervention") {
      if (event.detail === "Intervention démarrée") return "intervention_started";
      if (event.detail === "Intervention terminée") return "intervention_completed";
      if (event.detail?.includes("Signature")) return "intervention_signed";
      if (event.action === "created") return "intervention_assigned";
      return "entity_updated";
    }
    if (event.entityType === "case") {
      if (event.action === "created") return "case_created";
      return "case_status_changed";
    }
    return "entity_updated";
  }

  private async sendPushNotifications(
    event: PlanwiseDomainEvent,
    userIds: string[],
    eventType: NotificationEventType,
  ): Promise<void> {
    const recipientIds = userIds.filter((id) => id !== event.actorId);

    for (const userId of recipientIds) {
      try {
        const prefs = await this.getUserPreferences(userId, event.organizationId);
        const channels = getEnabledChannels(prefs?.preferences, eventType);

        if (channels.includes("push")) {
          const title = this.buildPushTitle(event);
          const body = this.buildPushBody(event);
          await firstValueFrom(
            this.httpService.post(`${NOTIFICATIONS_URL}/push-subscriptions/send`, {
              userId,
              organizationId: event.organizationId,
              title,
              body,
              url: this.buildPushUrl(event),
            }),
          );
        }
      } catch (err) {
        this.logger.debug(`Push notification skipped for user ${userId}`, (err as Error).message);
      }
    }
  }

  private async getUserPreferences(
    userId: string,
    organizationId: string,
  ): Promise<NotificationPreferencesResponse | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<NotificationPreferencesResponse>(
          `${NOTIFICATIONS_URL}/notification-preferences`,
          { params: { userId, organizationId } },
        ),
      );
      return response.data;
    } catch {
      return null;
    }
  }

  private buildPushTitle(event: PlanwiseDomainEvent): string {
    if (event.entityType === "intervention") {
      if (event.detail === "Intervention démarrée") return "Intervention démarrée";
      if (event.detail === "Intervention terminée") return "Intervention terminée";
      if (event.action === "created") return "Nouvelle intervention";
    }
    if (event.entityType === "case") {
      if (event.action === "created") return "Nouveau dossier";
      return "Dossier modifié";
    }
    return "Planwise";
  }

  private buildPushBody(event: PlanwiseDomainEvent): string {
    const actor = event.actorName ?? "Quelqu'un";
    const label = event.entityLabel ? ` « ${event.entityLabel} »` : "";
    return `${actor} — ${label || event.entityType}`;
  }

  private buildPushUrl(event: PlanwiseDomainEvent): string {
    if (event.relatedEntityType === "case" && event.relatedEntityId) {
      return `/cases/${event.relatedEntityId}`;
    }
    if (event.entityType === "case") return `/cases/${event.entityId}`;
    if (event.entityType === "intervention") return "/my-day";
    return "/";
  }

  private async getOrganizationUserIds(organizationId: string): Promise<string[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<UserResponse[]>(`${USERS_URL}/users`, {
          params: { organizationId },
        }),
      );
      return response.data.map((u) => u.id);
    } catch (err) {
      this.logger.warn(
        `Failed to fetch users for organization ${organizationId}`,
        (err as Error).message,
      );
      return [];
    }
  }
}
