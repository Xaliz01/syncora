import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true, collection: "invoice_sequences" })
export class InvoiceSequenceDocument extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true })
  organizationId!: string;

  @Prop({ required: true })
  series!: "F" | "A";

  @Prop({ required: true })
  year!: number;

  @Prop({ required: true, default: 0 })
  lastNumber!: number;
}

export const InvoiceSequenceSchema = SchemaFactory.createForClass(InvoiceSequenceDocument);
