import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import type { CaseHistoryAction } from "@planwise/shared";

@Schema({ _id: false })
export class CaseHistoryChangeSubDoc {
  @Prop({ required: true })
  field!: string;

  @Prop()
  oldValue?: string;

  @Prop()
  newValue?: string;
}

export const CaseHistoryChangeSubDocSchema = SchemaFactory.createForClass(CaseHistoryChangeSubDoc);

@Schema({ timestamps: true, _id: true, collection: "case_history" })
export class CaseHistoryDocument extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true })
  organizationId!: string;

  @Prop({ required: true })
  caseId!: string;

  @Prop({ required: true })
  actorId!: string;

  @Prop({ required: true })
  actorName!: string;

  @Prop({ type: String, required: true })
  action!: CaseHistoryAction;

  @Prop()
  details?: string;

  @Prop({ type: [CaseHistoryChangeSubDocSchema], default: [] })
  changes!: CaseHistoryChangeSubDoc[];
}

export const CaseHistorySchema = SchemaFactory.createForClass(CaseHistoryDocument);
CaseHistorySchema.index({ caseId: 1, createdAt: -1 });
CaseHistorySchema.index({ organizationId: 1, caseId: 1 });
