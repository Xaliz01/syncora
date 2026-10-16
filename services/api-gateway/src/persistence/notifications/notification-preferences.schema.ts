import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import type { NotificationPreferencesData } from "@planwise/shared";

@Schema({ timestamps: true, _id: true, collection: "notification_preferences" })
export class NotificationPreferencesDocument extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true, index: true })
  organizationId!: string;

  @Prop({ required: true, type: Object })
  preferences!: NotificationPreferencesData;
}

export const NotificationPreferencesSchema = SchemaFactory.createForClass(
  NotificationPreferencesDocument,
);
NotificationPreferencesSchema.index({ userId: 1, organizationId: 1 }, { unique: true });
