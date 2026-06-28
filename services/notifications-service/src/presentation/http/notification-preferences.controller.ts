import { BadRequestException, Body, Controller, Get, Put, Query } from "@nestjs/common";
import { AbstractNotificationPreferencesService } from "../../domain/ports/notification-preferences.service.port";
import type { UpdateNotificationPreferencesBody } from "@planwise/shared";

@Controller()
export class NotificationPreferencesController {
  constructor(private readonly preferencesService: AbstractNotificationPreferencesService) {}

  @Get("notification-preferences")
  async getPreferences(
    @Query("userId") userId: string,
    @Query("organizationId") organizationId: string,
  ) {
    if (!userId || !organizationId) {
      throw new BadRequestException("userId and organizationId are required");
    }
    return this.preferencesService.getPreferences(userId, organizationId);
  }

  @Put("notification-preferences")
  async updatePreferences(
    @Query("userId") userId: string,
    @Body() body: UpdateNotificationPreferencesBody,
  ) {
    if (!userId || !body.organizationId) {
      throw new BadRequestException("userId and organizationId are required");
    }
    return this.preferencesService.updatePreferences(userId, body.organizationId, body.preferences);
  }
}
