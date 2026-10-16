import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import type { CustomerKind } from "@planwise/shared";
import { PostalAddressSubDoc, PostalAddressSubDocSchema } from "./customer.schema";

@Schema({ timestamps: true, _id: true, collection: "order_givers" })
export class OrderGiverDocument extends Document {
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

  @Prop()
  notes?: string;

  @Prop({ type: Date })
  deletedAt?: Date | null;

  @Prop({ default: false })
  isTestData!: boolean;

  /** Identifiant dans le CRM source (import). */
  @Prop()
  importExternalId?: string;
}

export const OrderGiverSchema = SchemaFactory.createForClass(OrderGiverDocument);
OrderGiverSchema.index({ organizationId: 1, deletedAt: 1 });
OrderGiverSchema.index({
  organizationId: 1,
  companyName: 1,
  firstName: 1,
  lastName: 1,
  email: 1,
});
OrderGiverSchema.index(
  { organizationId: 1, importExternalId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      deletedAt: null,
      importExternalId: { $type: "string" },
    },
  },
);
