import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true, _id: true, collection: "intervention_prestation_usages" })
export class InterventionPrestationUsageDocument extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true })
  organizationId!: string;

  @Prop({ required: true })
  interventionId!: string;

  @Prop()
  caseId?: string;

  @Prop({ required: true })
  prestationId!: string;

  @Prop({ required: true, type: Number, default: 0 })
  quantity!: number;

  @Prop({ type: Date })
  deletedAt?: Date | null;
}

export const InterventionPrestationUsageSchema = SchemaFactory.createForClass(
  InterventionPrestationUsageDocument,
);
InterventionPrestationUsageSchema.index(
  { organizationId: 1, interventionId: 1, prestationId: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
InterventionPrestationUsageSchema.index({ organizationId: 1, caseId: 1, deletedAt: 1 });
InterventionPrestationUsageSchema.index({ organizationId: 1, interventionId: 1, deletedAt: 1 });
