import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type {
  CreateNotificationBody,
  NotificationListResponse,
  NotificationResponse,
} from "@planwise/shared";
import type { NotificationDocument } from "../persistence/notification.schema";
import { AbstractNotificationsService } from "./ports/notifications.service.port";
import { toNotificationResponse } from "./mappers/notification.mapper";

@Injectable()
export class NotificationsService extends AbstractNotificationsService {
  constructor(
    @InjectModel("Notification")
    private readonly notificationModel: Model<NotificationDocument>,
  ) {
    super();
  }

  async createForOrganization(
    body: CreateNotificationBody,
    userIds: string[],
  ): Promise<NotificationResponse[]> {
    const recipientIds = userIds.filter((id) => id !== body.actorId);
    if (recipientIds.length === 0) return [];

    const docs = await this.notificationModel.insertMany(
      recipientIds.map((userId) => ({
        organizationId: body.organizationId,
        userId,
        actorId: body.actorId,
        actorName: body.actorName,
        entityType: body.entityType,
        entityId: body.entityId,
        entityLabel: body.entityLabel,
        action: body.action,
        relatedEntityType: body.relatedEntityType,
        relatedEntityId: body.relatedEntityId,
        relatedEntityLabel: body.relatedEntityLabel,
        detail: body.detail,
        read: false,
      })),
    );

    return docs.map((d) => toNotificationResponse(d as NotificationDocument));
  }

  async listForUser(
    userId: string,
    organizationId: string,
    limit = 50,
  ): Promise<NotificationListResponse> {
    const [notifications, unreadCount] = await Promise.all([
      this.notificationModel
        .find({ userId, organizationId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments({ userId, organizationId, read: false }),
    ]);

    return {
      notifications: notifications.map((d) => toNotificationResponse(d)),
      unreadCount,
    };
  }

  async markAsRead(notificationId: string, userId: string): Promise<NotificationResponse> {
    const doc = await this.notificationModel
      .findOneAndUpdate({ _id: notificationId, userId }, { $set: { read: true } }, { new: true })
      .exec();
    if (!doc) throw new NotFoundException("Notification not found");
    return toNotificationResponse(doc);
  }

  async markAllAsRead(userId: string, organizationId: string): Promise<{ updated: number }> {
    const result = await this.notificationModel
      .updateMany({ userId, organizationId, read: false }, { $set: { read: true } })
      .exec();
    return { updated: result.modifiedCount };
  }

  async getUnreadCount(userId: string, organizationId: string): Promise<{ count: number }> {
    const count = await this.notificationModel.countDocuments({
      userId,
      organizationId,
      read: false,
    });
    return { count };
  }
}
