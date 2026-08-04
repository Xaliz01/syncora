import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true, _id: true, collection: "prestations" })
export class PrestationDocument extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true })
  organizationId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  reference!: string;

  @Prop()
  description?: string;

  @Prop({ required: true, default: "unité" })
  unit!: string;

  @Prop({ required: true, type: Number, default: 0 })
  defaultPrice!: number;

  @Prop({ required: true, type: Number, default: 20 })
  defaultTvaRate!: number;

  @Prop({ required: true, default: true })
  isActive!: boolean;

  @Prop({ type: Date })
  deletedAt?: Date | null;

  @Prop({ default: false })
  isTestData!: boolean;
}

export const PrestationSchema = SchemaFactory.createForClass(PrestationDocument);
PrestationSchema.index(
  { organizationId: 1, reference: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
PrestationSchema.index({ organizationId: 1, name: 1 });
