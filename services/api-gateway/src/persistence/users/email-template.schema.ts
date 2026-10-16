import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import type { PlatformEmailTemplatePurpose } from "@planwise/shared";

@Schema({ timestamps: true, _id: true, collection: "email_templates" })
export class EmailTemplateDocument extends Document {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, index: true })
  purpose!: PlatformEmailTemplatePurpose;

  @Prop({ required: true })
  subject!: string;

  @Prop({ required: true })
  body!: string;

  @Prop({ required: true, default: "" })
  footer!: string;

  @Prop({ required: true, default: "Voir dans Planwise" })
  ctaLabel!: string;

  @Prop({ required: true, default: "/" })
  ctaUrl!: string;

  @Prop({ required: true, default: false, index: true })
  isDefault!: boolean;
}

export const EmailTemplateSchema = SchemaFactory.createForClass(EmailTemplateDocument);
EmailTemplateSchema.index({ purpose: 1, name: 1 }, { unique: true });
