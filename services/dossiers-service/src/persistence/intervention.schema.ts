import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import type { InterventionStatus } from "@syncora/shared";

@Schema({ timestamps: true, _id: true })
export class InterventionDocument extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true })
  organizationId!: string;

  @Prop({ required: true })
  dossierId!: string;

  @Prop({ required: true })
  title!: string;

  @Prop()
  description?: string;

  @Prop({ type: String, default: "planned" })
  status!: InterventionStatus;

  @Prop()
  assigneeId?: string;

  @Prop()
  assigneeName?: string;

  @Prop()
  scheduledStart?: Date;

  @Prop()
  scheduledEnd?: Date;

  @Prop()
  notes?: string;
}

export const InterventionSchema = SchemaFactory.createForClass(InterventionDocument);
InterventionSchema.index({ organizationId: 1, dossierId: 1 });
InterventionSchema.index({ organizationId: 1, assigneeId: 1, scheduledStart: 1 });
InterventionSchema.index({ organizationId: 1, scheduledStart: 1, scheduledEnd: 1 });
