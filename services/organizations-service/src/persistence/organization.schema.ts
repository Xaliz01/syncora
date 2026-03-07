import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: true, _id: true })
export class OrganizationDocument extends Document {
  @Prop({ required: true })
  name!: string;
}

export const OrganizationSchema = SchemaFactory.createForClass(OrganizationDocument);
