import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import type { AiUsageKey } from "@planwise/shared";

@Schema({ timestamps: true, collection: "ai_quota_counters" })
export class AiQuotaCounterDocument extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true })
  organizationId!: string;

  @Prop({ required: true })
  usage!: AiUsageKey;

  /** `trial` pendant l'essai, sinon `YYYY-MM`. */
  @Prop({ required: true })
  period!: string;

  @Prop({ required: true, default: 0 })
  count!: number;
}

export const AiQuotaCounterSchema = SchemaFactory.createForClass(AiQuotaCounterDocument);
AiQuotaCounterSchema.index(
  { organizationId: 1, usage: 1, period: 1 },
  { unique: true, name: "ai_quota_org_usage_period" },
);
