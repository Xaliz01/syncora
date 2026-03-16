import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: true, _id: true })
export class AgenceDocument extends Document {
  @Prop({ required: true })
  organizationId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop()
  address?: string;

  @Prop()
  city?: string;

  @Prop()
  postalCode?: string;

  @Prop()
  phone?: string;
}

export const AgenceSchema = SchemaFactory.createForClass(AgenceDocument);
AgenceSchema.index({ organizationId: 1, name: 1 }, { unique: true });
