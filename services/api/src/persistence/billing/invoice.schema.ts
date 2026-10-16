import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import type {
  InvoicePartySnapshot,
  InvoiceSellerSnapshot,
  InvoiceEmailSendEntry,
  LocalInvoiceKind,
  LocalInvoiceLine,
  LocalInvoiceStatus,
} from "@planwise/shared";

@Schema({ timestamps: true, collection: "invoices" })
export class InvoiceDocument extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true, index: true })
  organizationId!: string;

  @Prop({ required: true, index: true })
  caseId!: string;

  @Prop()
  quoteId?: string;

  @Prop({ required: true })
  kind!: LocalInvoiceKind;

  @Prop({ required: true, default: "draft" })
  status!: LocalInvoiceStatus;

  @Prop()
  number?: string;

  @Prop()
  draftNumber?: string;

  @Prop({ required: true })
  invoiceDate!: Date;

  @Prop()
  situationNumber?: number;

  @Prop()
  situationPercent?: number;

  @Prop({ required: true })
  amountHt!: string;

  @Prop({ required: true })
  amountTtc!: string;

  @Prop({ type: Array, required: true, default: [] })
  lines!: LocalInvoiceLine[];

  @Prop({ type: Object, required: true })
  customer!: InvoicePartySnapshot;

  @Prop({ type: Object })
  seller?: InvoiceSellerSnapshot;

  @Prop()
  creditedInvoiceId?: string;

  @Prop()
  caseTitle?: string;

  @Prop({ type: Array, default: [] })
  emailSends?: InvoiceEmailSendEntry[];

  @Prop({ type: [String], default: [] })
  interventionIds?: string[];

  @Prop()
  finalizedAt?: Date;

  @Prop()
  deletedAt?: Date;
}

export const InvoiceSchema = SchemaFactory.createForClass(InvoiceDocument);
