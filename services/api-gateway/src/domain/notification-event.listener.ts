import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type { SyncoraDomainEvent } from "../infrastructure/notify.interceptor";
import type {
  CreateNotificationBody,
  NotificationEntityType,
  NotificationAction,
  UserResponse,
} from "@syncora/shared";

const USERS_URL = process.env.USERS_SERVICE_URL ?? "http://localhost:3002";
const NOTIFICATIONS_URL = process.env.NOTIFICATIONS_SERVICE_URL ?? "http://localhost:3010";

@Injectable()
export class NotificationEventListener {
  private readonly logger = new Logger(NotificationEventListener.name);

  constructor(private readonly httpService: HttpService) {}

  @OnEvent("syncora.entity.changed", { async: true })
  async handleEntityChanged(event: SyncoraDomainEvent): Promise<void> {
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
        userIds,
      };

      await firstValueFrom(this.httpService.post(`${NOTIFICATIONS_URL}/notifications`, body));
    } catch (err) {
      this.logger.warn(
        `Failed to create notifications for ${event.entityType}:${event.entityId}`,
        (err as Error).message,
      );
    }
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
