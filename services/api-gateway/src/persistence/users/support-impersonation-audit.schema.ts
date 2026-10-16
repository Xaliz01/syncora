import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: true, _id: true, collection: "support_impersonation_audits" })
export class SupportImpersonationAuditDocument extends Document {
  @Prop({ required: true, index: true })
  impersonatorUserId!: string;

  @Prop({ required: true })
  impersonatorEmail!: string;

  @Prop({ required: true, index: true })
  targetUserId!: string;

  @Prop({ required: true })
  targetEmail!: string;

  @Prop({ required: true, index: true })
  organizationId!: string;

  @Prop({ required: true })
  reason!: string;

  @Prop({ required: true })
  startedAt!: Date;

  @Prop()
  expiresAt?: Date;
}

export const SupportImpersonationAuditSchema = SchemaFactory.createForClass(
  SupportImpersonationAuditDocument,
);
SupportImpersonationAuditSchema.index({ startedAt: -1 });
