import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true, _id: true, collection: "push_subscriptions" })
export class PushSubscriptionDocument extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true, index: true })
  organizationId!: string;

  @Prop({ required: true, unique: true })
  endpoint!: string;

  @Prop({ required: true })
  p256dh!: string;

  @Prop({ required: true })
  auth!: string;
}

export const PushSubscriptionSchema = SchemaFactory.createForClass(PushSubscriptionDocument);
PushSubscriptionSchema.index({ userId: 1, organizationId: 1 });
