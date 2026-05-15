import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true, _id: true, collection: "organization_subscriptions" })
export class OrganizationSubscriptionDocument extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true, unique: true })
  organizationId!: string;

  @Prop()
  stripeCustomerId?: string;

  @Prop()
  stripeSubscriptionId?: string;

  /** Statut Stripe (trialing, active, past_due, canceled, …). */
  @Prop({ required: true, default: "none" })
  stripeStatus!: string;

  @Prop()
  trialEndsAt?: Date;

  @Prop()
  currentPeriodEnd?: Date;

  @Prop({ default: false })
  cancelAtPeriodEnd!: boolean;
}

export const OrganizationSubscriptionSchema = SchemaFactory.createForClass(
  OrganizationSubscriptionDocument,
);
