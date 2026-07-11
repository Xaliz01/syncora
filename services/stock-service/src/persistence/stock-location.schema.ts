import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import type { StockLocationType } from "@planwise/shared";

@Schema({ timestamps: true, _id: true, collection: "stock_locations" })
export class StockLocationDocument extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true })
  organizationId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, type: String })
  type!: StockLocationType;

  @Prop()
  referenceId?: string;

  @Prop()
  address?: string;

  @Prop({ required: true, default: false })
  isDefault!: boolean;

  @Prop({ default: false })
  isTestData!: boolean;
}

export const StockLocationSchema = SchemaFactory.createForClass(StockLocationDocument);
StockLocationSchema.index({ organizationId: 1, name: 1 }, { unique: true });
StockLocationSchema.index({ organizationId: 1, type: 1 });
StockLocationSchema.index({ organizationId: 1, isDefault: 1 });
