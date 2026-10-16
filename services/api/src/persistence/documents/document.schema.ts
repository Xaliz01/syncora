import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: true, _id: true, collection: "documents" })
export class DocumentRecord extends Document {
  @Prop({ required: true })
  organizationId!: string;

  @Prop({ required: true })
  entityType!: string;

  @Prop({ required: true })
  entityId!: string;

  @Prop({ required: true })
  originalName!: string;

  @Prop({ required: true })
  mimeType!: string;

  @Prop({ required: true })
  size!: number;

  @Prop({ required: true })
  storageKey!: string;

  @Prop({ required: true })
  uploadedBy!: string;

  @Prop({ type: Date })
  deletedAt?: Date | null;
}

export const DocumentSchema = SchemaFactory.createForClass(DocumentRecord);

DocumentSchema.index({ organizationId: 1, entityType: 1, entityId: 1 });
DocumentSchema.index({ organizationId: 1, storageKey: 1 }, { unique: true });
