import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: true, _id: true, collection: "prospect_outreaches" })
export class ProspectOutreachDocument extends Document {
  @Prop({ required: true, unique: true, index: true })
  siren!: string;

  @Prop({ required: true })
  companyName!: string;

  @Prop({ required: false, default: "" })
  email!: string;

  @Prop({ required: true, index: true })
  sentByUserId!: string;

  @Prop({ required: true })
  sentByEmail!: string;

  @Prop({ required: true })
  subject!: string;

  @Prop({ required: true, default: "sent" })
  status!: "sent" | "failed" | "email_not_found" | "noted";

  @Prop({ required: true })
  sentAt!: Date;

  @Prop({ required: false, default: "" })
  comment?: string;
}

export const ProspectOutreachSchema = SchemaFactory.createForClass(ProspectOutreachDocument);
ProspectOutreachSchema.index({ sentAt: -1 });
