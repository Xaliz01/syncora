import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import type { CustomerKind } from "@planwise/shared";

@Schema({ _id: false })
export class PostalAddressSubDoc {
  @Prop({ required: true })
  line1!: string;

  @Prop()
  line2?: string;

  @Prop({ required: true })
  postalCode!: string;

  @Prop({ required: true })
  city!: string;

  @Prop({ default: "FR" })
  country!: string;
}

export const PostalAddressSubDocSchema = SchemaFactory.createForClass(PostalAddressSubDoc);

@Schema({ _id: true })
export class CustomerSiteSubDoc {
  declare _id: Types.ObjectId;

  @Prop({ required: true })
  label!: string;

  @Prop({ type: PostalAddressSubDocSchema, required: true })
  address!: PostalAddressSubDoc;

  @Prop({ default: false })
  isDefault!: boolean;

  @Prop()
  notes?: string;
}

export const CustomerSiteSubDocSchema = SchemaFactory.createForClass(CustomerSiteSubDoc);

@Schema({ timestamps: true, _id: true, collection: "customers" })
export class CustomerDocument extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true })
  organizationId!: string;

  @Prop({ type: String, required: true })
  kind!: CustomerKind;

  @Prop()
  firstName?: string;

  @Prop()
  lastName?: string;

  @Prop()
  companyName?: string;

  @Prop()
  legalIdentifier?: string;

  @Prop()
  email?: string;

  @Prop()
  phone?: string;

  @Prop()
  mobile?: string;

  @Prop({ type: PostalAddressSubDocSchema })
  address?: PostalAddressSubDoc;

  @Prop({ type: [CustomerSiteSubDocSchema], default: [] })
  sites!: CustomerSiteSubDoc[];

  @Prop()
  notes?: string;

  @Prop({ type: Date })
  deletedAt?: Date | null;

  @Prop({ default: false })
  isTestData!: boolean;
}

export const CustomerSchema = SchemaFactory.createForClass(CustomerDocument);
CustomerSchema.index({ organizationId: 1, deletedAt: 1 });
CustomerSchema.index({
  organizationId: 1,
  companyName: 1,
  firstName: 1,
  lastName: 1,
  email: 1,
});
