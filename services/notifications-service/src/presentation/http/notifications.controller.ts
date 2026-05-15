import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { AbstractNotificationsService } from "../../domain/ports/notifications.service.port";
import type { CreateNotificationBody } from "@syncora/shared";

@Controller()
export class NotificationsController {
  constructor(private readonly notificationsService: AbstractNotificationsService) {}

  @Post("notifications")
  async createForOrganization(@Body() body: CreateNotificationBody & { userIds: string[] }) {
    if (!body.organizationId || !body.userIds?.length) {
      throw new BadRequestException("organizationId and userIds are required");
    }
    return this.notificationsService.createForOrganization(body, body.userIds);
  }

  @Get("notifications")
  async listForUser(
    @Query("userId") userId: string,
    @Query("organizationId") organizationId: string,
    @Query("limit") limit?: string,
  ) {
    if (!userId || !organizationId) {
      throw new BadRequestException("userId and organizationId are required");
    }
    return this.notificationsService.listForUser(
      userId,
      organizationId,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Patch("notifications/:id/read")
  async markAsRead(@Param("id") id: string, @Query("userId") userId: string) {
    if (!userId) throw new BadRequestException("userId is required");
    return this.notificationsService.markAsRead(id, userId);
  }

  @Patch("notifications/read-all")
  async markAllAsRead(
    @Query("userId") userId: string,
    @Query("organizationId") organizationId: string,
  ) {
    if (!userId || !organizationId) {
      throw new BadRequestException("userId and organizationId are required");
    }
    return this.notificationsService.markAllAsRead(userId, organizationId);
  }

  @Get("notifications/unread-count")
  async getUnreadCount(
    @Query("userId") userId: string,
    @Query("organizationId") organizationId: string,
  ) {
    if (!userId || !organizationId) {
      throw new BadRequestException("userId and organizationId are required");
    }
    return this.notificationsService.getUnreadCount(userId, organizationId);
  }
}
