import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: true, _id: true, collection: "organizations" })
export class OrganizationDocument extends Document {
  @Prop({ required: true })
  name!: string;

  @Prop({ type: Date })
  deletedAt?: Date | null;
}

export const OrganizationSchema = SchemaFactory.createForClass(OrganizationDocument);
