import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

/**
 * Compteur de quota IA mensuel par organisation et usage.
 * Un document = (org, usage, period) ; `count` est incrémenté atomiquement.
 */
@Schema({ timestamps: true, collection: "ai_quota_counters" })
export class AiQuotaCounterDocument extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true })
  organizationId!: string;

  @Prop({ required: true })
  usage!: string;

  /** Format YYYY-MM (reset calendaire mensuel). Essai : période unique "trial". */
  @Prop({ required: true })
  period!: string;

  @Prop({ default: 0 })
  count!: number;
}

export const AiQuotaCounterSchema = SchemaFactory.createForClass(AiQuotaCounterDocument);
AiQuotaCounterSchema.index({ organizationId: 1, usage: 1, period: 1 }, { unique: true });
