import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AbstractNotificationsGatewayService } from "../../domain/ports/notifications.gateway.service.port";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import { SubscriptionAccessGuard } from "../../infrastructure/subscription-access.guard";
import { CurrentUser } from "../../infrastructure/current-user.decorator";
import type {
  AuthUser,
  NotificationPreferencesData,
  RegisterPushSubscriptionBody,
} from "@planwise/shared";

@Controller("notifications")
@UseGuards(JwtAuthGuard, SubscriptionAccessGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: AbstractNotificationsGatewayService) {}

  @Get()
  async list(@CurrentUser() user: AuthUser, @Query("limit") limit?: string) {
    return this.notificationsService.listForCurrentUser(
      user,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Patch(":id/read")
  async markAsRead(@CurrentUser() user: AuthUser, @Param("id") id: string) {
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

  @Get("preferences")
  async getPreferences(@CurrentUser() user: AuthUser) {
    return this.notificationsService.getPreferences(user);
  }

  @Put("preferences")
  async updatePreferences(
    @CurrentUser() user: AuthUser,
    @Body() body: { preferences: NotificationPreferencesData },
  ) {
    return this.notificationsService.updatePreferences(user, body.preferences);
  }

  @Post("push-subscriptions")
  async registerPushSubscription(
    @CurrentUser() user: AuthUser,
    @Body() body: RegisterPushSubscriptionBody,
  ) {
    return this.notificationsService.registerPushSubscription(user, body);
  }

  @Delete("push-subscriptions")
  async unregisterPushSubscription(
    @CurrentUser() user: AuthUser,
    @Query("endpoint") endpoint: string,
  ) {
    return this.notificationsService.unregisterPushSubscription(user, endpoint);
  }

  @Get("push-subscriptions")
  async listPushSubscriptions(@CurrentUser() user: AuthUser) {
    return this.notificationsService.listPushSubscriptions(user);
  }

  @Get("vapid-public-key")
  async getVapidPublicKey() {
    return this.notificationsService.getVapidPublicKey();
  }
}
