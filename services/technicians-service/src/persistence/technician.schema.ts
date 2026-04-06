import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: true, _id: true, collection: "technicians" })
export class TechnicianDocument extends Document {
  @Prop({ required: true })
  organizationId!: string;

  @Prop({ required: true })
  firstName!: string;

  @Prop({ required: true })
  lastName!: string;

  @Prop()
  email?: string;

  @Prop()
  phone?: string;

  @Prop()
  speciality?: string;

  @Prop({ required: true, default: "actif" })
  status!: string;

  @Prop()
  userId?: string;

  @Prop({ type: Date })
  deletedAt?: Date | null;
}

export const TechnicianSchema = SchemaFactory.createForClass(TechnicianDocument);
