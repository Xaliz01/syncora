import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards
} from "@nestjs/common";
import { AbstractNotificationsGatewayService } from "../../domain/ports/notifications.gateway.service.port";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import { SubscriptionAccessGuard } from "../../infrastructure/subscription-access.guard";
import { CurrentUser } from "../../infrastructure/current-user.decorator";
import type { AuthUser } from "@syncora/shared";

@Controller("notifications")
@UseGuards(JwtAuthGuard, SubscriptionAccessGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: AbstractNotificationsGatewayService
  ) {}

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query("limit") limit?: string
  ) {
    return this.notificationsService.listForCurrentUser(
      user,
      limit ? parseInt(limit, 10) : undefined
    );
  }

  @Patch(":id/read")
  async markAsRead(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string
  ) {
    return this.notificationsService.markAsRead(user, id);
  }

  @Patch("read-all")
  async markAllAsRead(@CurrentUser() user: AuthUser) {
    return this.notificationsService.markAllAsRead(user);
  }

  @Get("unread-count")
  async getUnreadCount(@CurrentUser() user: AuthUser) {
    return this.notificationsService.getUnreadCount(user);
  }
}
