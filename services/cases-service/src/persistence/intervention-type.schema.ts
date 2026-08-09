import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true, _id: true, collection: "intervention_types" })
export class InterventionTypeDocument extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true })
  organizationId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop()
  description?: string;

  /** Couleur hex `#RRGGBB`. */
  @Prop()
  color?: string;

  @Prop({ type: Date })
  deletedAt?: Date | null;

  @Prop({ default: false })
  isTestData!: boolean;
}

export const InterventionTypeSchema = SchemaFactory.createForClass(InterventionTypeDocument);
InterventionTypeSchema.index(
  { organizationId: 1, name: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
InterventionTypeSchema.index({ organizationId: 1 });
