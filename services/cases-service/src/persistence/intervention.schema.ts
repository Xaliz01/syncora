import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import type { InterventionStatus } from "@syncora/shared";

@Schema({ _id: false })
export class InterventionUsedArticleSubDoc {
  @Prop({ required: true })
  articleId!: string;

  @Prop({ required: true })
  articleName!: string;

  @Prop()
  articleReference?: string;

  @Prop({ required: true, default: "unité" })
  unit!: string;

  @Prop({ required: true, default: 0 })
  consumedQuantity!: number;

  @Prop({ required: true, default: 0 })
  returnedQuantity!: number;

  @Prop()
  lastMovementAt?: Date;
}

export const InterventionUsedArticleSubDocSchema = SchemaFactory.createForClass(
  InterventionUsedArticleSubDoc
);

@Schema({ timestamps: true, _id: true })
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
  scheduledStart?: Date;

  @Prop()
  scheduledEnd?: Date;

  @Prop()
  notes?: string;

  @Prop({ type: [InterventionUsedArticleSubDocSchema], default: [] })
  usedArticles!: InterventionUsedArticleSubDoc[];
}

export const InterventionSchema = SchemaFactory.createForClass(InterventionDocument);
InterventionSchema.index({ organizationId: 1, caseId: 1 });
InterventionSchema.index({ organizationId: 1, assigneeId: 1, scheduledStart: 1 });
InterventionSchema.index({ organizationId: 1, scheduledStart: 1, scheduledEnd: 1 });
