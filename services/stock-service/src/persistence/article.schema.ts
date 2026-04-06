import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: true, _id: true, collection: "articles" })
export class ArticleDocument extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true })
  organizationId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  reference!: string;

  @Prop()
  description?: string;

  @Prop({ required: true, default: "unité" })
  unit!: string;

  @Prop({ required: true, default: 0 })
  stockQuantity!: number;

  @Prop({ required: true, default: 0 })
  reorderPoint!: number;

  @Prop({ required: true, default: 0 })
  targetStock!: number;

  @Prop({ required: true, default: true })
  isActive!: boolean;

  @Prop()
  lastMovementAt?: Date;

  @Prop({ type: Date })
  deletedAt?: Date | null;
}

export const ArticleSchema = SchemaFactory.createForClass(ArticleDocument);
ArticleSchema.index(
  { organizationId: 1, reference: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);
ArticleSchema.index({ organizationId: 1, name: 1 });
ArticleSchema.index({ organizationId: 1, stockQuantity: 1 });
