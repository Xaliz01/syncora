import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type {
  CreateNotificationBody,
  NotificationListResponse,
  NotificationResponse,
} from "@syncora/shared";
import type { NotificationDocument } from "../persistence/notification.schema";
import { AbstractNotificationsService } from "./ports/notifications.service.port";

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
        read: false,
      })),
    );

    return docs.map((d) => this.toResponse(d as NotificationDocument));
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
      notifications: notifications.map((d) => this.toResponse(d)),
      unreadCount,
    };
  }

  async markAsRead(notificationId: string, userId: string): Promise<NotificationResponse> {
    const doc = await this.notificationModel
      .findOneAndUpdate({ _id: notificationId, userId }, { $set: { read: true } }, { new: true })
      .exec();
    if (!doc) throw new NotFoundException("Notification not found");
    return this.toResponse(doc);
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

  private toResponse(doc: NotificationDocument): NotificationResponse {
    return {
      id: doc._id.toString(),
      organizationId: doc.organizationId,
      userId: doc.userId,
      actorId: doc.actorId,
      actorName: doc.actorName,
      entityType: doc.entityType,
      entityId: doc.entityId,
      entityLabel: doc.entityLabel,
      action: doc.action,
      read: doc.read,
      createdAt: doc.get("createdAt")?.toISOString(),
    };
  }
}
