import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type {
  NotificationPreferencesData,
  NotificationPreferencesResponse,
} from "@planwise/shared";
import { buildDefaultNotificationPreferences } from "@planwise/shared";
import type { NotificationPreferencesDocument } from "../persistence/notification-preferences.schema";
import { AbstractNotificationPreferencesService } from "./ports/notification-preferences.service.port";

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
    if (doc) return this.toResponse(doc);

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
    const doc = await this.preferencesModel
      .findOneAndUpdate(
        { userId, organizationId },
        { $set: { preferences } },
        { new: true, upsert: true },
      )
      .exec();
    return this.toResponse(doc!);
  }

  private toResponse(doc: NotificationPreferencesDocument): NotificationPreferencesResponse {
    return {
      id: doc._id.toString(),
      userId: doc.userId,
      organizationId: doc.organizationId,
      preferences: doc.preferences,
      createdAt: doc.get("createdAt")?.toISOString(),
      updatedAt: doc.get("updatedAt")?.toISOString(),
    };
  }
}
