import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: true, _id: true })
export class VehicleDocument extends Document {
  @Prop({ required: true })
  organizationId!: string;

  @Prop({ required: true })
  type!: string;

  @Prop({ required: true })
  registrationNumber!: string;

  @Prop()
  brand?: string;

  @Prop()
  vehicleModel?: string;

  @Prop()
  year?: number;

  @Prop()
  color?: string;

  @Prop()
  vin?: string;

  @Prop({ default: 0 })
  mileage?: number;

  @Prop({ required: true, default: "actif" })
  status!: string;

  @Prop()
  assignedTechnicianId?: string;
}

export const VehicleSchema = SchemaFactory.createForClass(VehicleDocument);

VehicleSchema.index({ organizationId: 1, registrationNumber: 1 }, { unique: true });
