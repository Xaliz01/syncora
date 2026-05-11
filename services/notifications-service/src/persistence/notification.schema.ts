import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import type { NotificationAction, NotificationEntityType } from "@syncora/shared";

@Schema({ timestamps: true, _id: true, collection: "notifications" })
export class NotificationDocument extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true, index: true })
  organizationId!: string;

  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true })
  actorId!: string;

  @Prop()
  actorName?: string;

  @Prop({ required: true, type: String })
  entityType!: NotificationEntityType;

  @Prop({ required: true })
  entityId!: string;

  @Prop()
  entityLabel?: string;

  @Prop({ required: true, type: String })
  action!: NotificationAction;

  @Prop({ default: false })
  read!: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(NotificationDocument);
NotificationSchema.index({ userId: 1, organizationId: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
