import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true, _id: true, collection: "sent_reminders" })
export class SentReminderDocument extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true })
  interventionId!: string;

  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  leadTime!: number;
}

export const SentReminderSchema = SchemaFactory.createForClass(SentReminderDocument);
SentReminderSchema.index(
  { interventionId: 1, userId: 1, leadTime: 1 },
  { unique: true },
);
SentReminderSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2 * 60 * 60 });
