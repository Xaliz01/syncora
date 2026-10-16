import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import type { CommentEntityType } from "@planwise/shared";

@Schema({ timestamps: true, _id: true, collection: "comments" })
export class CommentDocument extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true })
  organizationId!: string;

  @Prop({ type: String, required: true })
  entityType!: CommentEntityType;

  @Prop({ required: true })
  entityId!: string;

  @Prop({ required: true })
  caseId!: string;

  @Prop({ required: true })
  body!: string;

  @Prop({ required: true })
  authorId!: string;

  @Prop({ required: true })
  authorName!: string;

  @Prop({ type: Date })
  deletedAt?: Date | null;

  @Prop({ default: false })
  isTestData!: boolean;
}

export const CommentSchema = SchemaFactory.createForClass(CommentDocument);
CommentSchema.index({ organizationId: 1, entityType: 1, entityId: 1, deletedAt: 1 });
CommentSchema.index({ organizationId: 1, caseId: 1 });
