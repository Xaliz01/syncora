import { Injectable, NotFoundException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  AuthUser,
  NotificationListResponse,
  NotificationResponse
} from "@syncora/shared";
import { AbstractNotificationsGatewayService } from "./ports/notifications.gateway.service.port";

const NOTIFICATIONS_URL =
  process.env.NOTIFICATIONS_SERVICE_URL ?? "http://localhost:3010";

@Injectable()
export class NotificationsGatewayService extends AbstractNotificationsGatewayService {
  constructor(private readonly httpService: HttpService) {
    super();
  }

  async listForCurrentUser(
    user: AuthUser,
    limit?: number
  ): Promise<NotificationListResponse> {
    const response = await firstValueFrom(
      this.httpService.get<NotificationListResponse>(
        `${NOTIFICATIONS_URL}/notifications`,
        {
          params: {
            userId: user.id,
            organizationId: user.organizationId,
            ...(limit ? { limit: String(limit) } : {})
          }
        }
      )
    );
    return response.data;
  }

  async markAsRead(
    user: AuthUser,
    notificationId: string
  ): Promise<NotificationResponse> {
    try {
      const response = await firstValueFrom(
        this.httpService.patch<NotificationResponse>(
          `${NOTIFICATIONS_URL}/notifications/${notificationId}/read`,
          {},
          { params: { userId: user.id } }
        )
      );
      return response.data;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) throw new NotFoundException("Notification introuvable");
      throw err;
    }
  }

  async markAllAsRead(user: AuthUser): Promise<{ updated: number }> {
    const response = await firstValueFrom(
      this.httpService.patch<{ updated: number }>(
        `${NOTIFICATIONS_URL}/notifications/read-all`,
        {},
        {
          params: {
            userId: user.id,
            organizationId: user.organizationId
          }
        }
      )
    );
    return response.data;
  }

  async getUnreadCount(user: AuthUser): Promise<{ count: number }> {
    const response = await firstValueFrom(
      this.httpService.get<{ count: number }>(
        `${NOTIFICATIONS_URL}/notifications/unread-count`,
        {
          params: {
            userId: user.id,
            organizationId: user.organizationId
          }
        }
      )
    );
    return response.data;
  }
}
