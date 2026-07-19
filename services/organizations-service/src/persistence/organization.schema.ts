import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import type { TrialTestDataStatus } from "@planwise/shared";

@Schema({ _id: false })
export class OrganizationTrialTestDataSubDoc {
  @Prop({ type: String, required: true, default: "none" })
  status!: TrialTestDataStatus;

  @Prop({ type: Date })
  injectedAt?: Date;

  @Prop({ type: String, default: null })
  errorMessage?: string | null;
}

export const OrganizationTrialTestDataSubDocSchema = SchemaFactory.createForClass(
  OrganizationTrialTestDataSubDoc,
);

@Schema({ timestamps: true, _id: true, collection: "organizations" })
export class OrganizationDocument extends Document {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, immutable: true })
  siret!: string;

  @Prop()
  email?: string;

  @Prop()
  phone?: string;

  @Prop()
  addressLine1?: string;

  @Prop()
  addressLine2?: string;

  @Prop()
  postalCode?: string;

  @Prop()
  city?: string;

  @Prop()
  country?: string;

  /** ID document (image) utilisé comme logo sur les devis. */
  @Prop()
  logoDocumentId?: string;

  @Prop({ type: Date })
  deletedAt?: Date | null;

  @Prop({ type: OrganizationTrialTestDataSubDocSchema })
  trialTestData?: OrganizationTrialTestDataSubDoc;
}

export const OrganizationSchema = SchemaFactory.createForClass(OrganizationDocument);
