import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import type { QuoteStatus, TvaRate } from "@planwise/shared";

@Schema({ _id: false })
export class QuoteLineSubDoc {
  @Prop({ type: String, default: () => new Types.ObjectId().toHexString() })
  id!: string;

  @Prop()
  articleId?: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true })
  quantity!: number;

  @Prop({ required: true })
  unitPrice!: number;

  @Prop({ required: true, type: Number })
  tvaRate!: TvaRate;

  @Prop()
  unit?: string;
}

export const QuoteLineSubDocSchema = SchemaFactory.createForClass(QuoteLineSubDoc);

@Schema({ timestamps: true, _id: true, collection: "quotes" })
export class QuoteDocument extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true, index: true })
  organizationId!: string;

  @Prop({ required: true, index: true })
  caseId!: string;

  @Prop({ required: true })
  quoteNumber!: string;

  @Prop()
  subject?: string;

  @Prop()
  notes?: string;

  @Prop({ type: String, default: "draft" })
  status!: QuoteStatus;

  @Prop({ type: Date })
  validUntil?: Date;

  @Prop({ type: [QuoteLineSubDocSchema], default: [] })
  lines!: QuoteLineSubDoc[];

  @Prop({ type: Date })
  deletedAt?: Date | null;

  @Prop({ default: false })
  isTestData!: boolean;
}

export const QuoteSchema = SchemaFactory.createForClass(QuoteDocument);
QuoteSchema.index({ organizationId: 1, caseId: 1 });
QuoteSchema.index({ organizationId: 1, status: 1 });
/** Numéro unique par organisation (pas globalement). */
QuoteSchema.index(
  { organizationId: 1, quoteNumber: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
