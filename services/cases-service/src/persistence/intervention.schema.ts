import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import type { GeoLocation, InterventionStatus } from "@syncora/shared";

@Schema({ _id: false })
export class GeoLocationSchema {
  @Prop({ required: true })
  latitude!: number;

  @Prop({ required: true })
  longitude!: number;

  @Prop()
  accuracy?: number;
}

@Schema({ timestamps: true, _id: true, collection: "interventions" })
export class InterventionDocument extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true })
  organizationId!: string;

  @Prop({ required: true })
  caseId!: string;

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
  assignedTeamId?: string;

  @Prop()
  assignedTeamName?: string;

  @Prop()
  scheduledStart?: Date;

  @Prop()
  scheduledEnd?: Date;

  @Prop({ type: Date })
  startedAt?: Date;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: GeoLocationSchema })
  startLocation?: GeoLocation;

  @Prop({ type: GeoLocationSchema })
  endLocation?: GeoLocation;

  @Prop()
  notes?: string;

  @Prop({ type: Date })
  deletedAt?: Date | null;

  @Prop({ default: false })
  isTestData!: boolean;
}

export const InterventionSchema = SchemaFactory.createForClass(InterventionDocument);
InterventionSchema.index({ organizationId: 1, caseId: 1 });
InterventionSchema.index({ organizationId: 1, assigneeId: 1, scheduledStart: 1 });
InterventionSchema.index({ organizationId: 1, scheduledStart: 1, scheduledEnd: 1 });
