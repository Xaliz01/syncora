import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true, _id: true, collection: "processed_stripe_events" })
export class ProcessedStripeEventDocument extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true, unique: true })
  eventId!: string;
}

export const ProcessedStripeEventSchema = SchemaFactory.createForClass(
  ProcessedStripeEventDocument,
);
