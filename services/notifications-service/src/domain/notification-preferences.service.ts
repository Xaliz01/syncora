import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type {
  NotificationPreferencesData,
  NotificationPreferencesResponse,
} from "@planwise/shared";
import {
  buildDefaultNotificationPreferences,
  mergeNotificationPreferencesWithDefaults,
} from "@planwise/shared";
import type { NotificationPreferencesDocument } from "../persistence/notification-preferences.schema";
import { AbstractNotificationPreferencesService } from "./ports/notification-preferences.service.port";
import { toNotificationPreferencesResponse } from "./mappers/notification-preferences.mapper";

@Injectable()
export class NotificationPreferencesService extends AbstractNotificationPreferencesService {
  constructor(
    @InjectModel("NotificationPreferences")
    private readonly preferencesModel: Model<NotificationPreferencesDocument>,
  ) {
    super();
  }

  async getPreferences(
    userId: string,
    organizationId: string,
  ): Promise<NotificationPreferencesResponse> {
    const doc = await this.preferencesModel.findOne({ userId, organizationId }).exec();
    if (doc) return toNotificationPreferencesResponse(doc);

    return {
      id: "",
      userId,
      organizationId,
      preferences: buildDefaultNotificationPreferences(),
    };
  }

  async updatePreferences(
    userId: string,
    organizationId: string,
    preferences: NotificationPreferencesData,
  ): Promise<NotificationPreferencesResponse> {
    const normalized = mergeNotificationPreferencesWithDefaults(preferences);
    const doc = await this.preferencesModel
      .findOneAndUpdate(
        { userId, organizationId },
        { $set: { preferences: normalized } },
        { new: true, upsert: true },
      )
      .exec();
    return toNotificationPreferencesResponse(doc!);
  }
}
