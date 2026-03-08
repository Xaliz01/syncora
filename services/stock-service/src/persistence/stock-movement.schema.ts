import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import type { StockMovementType } from "@syncora/shared";

@Schema({ timestamps: true, _id: true })
export class StockMovementDocument extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true })
  organizationId!: string;

  @Prop({ required: true })
  articleId!: string;

  @Prop({ required: true })
  articleName!: string;

  @Prop()
  articleReference?: string;

  @Prop({ required: true, type: String })
  movementType!: StockMovementType;

  @Prop({ required: true })
  quantity!: number;

  @Prop({ required: true })
  previousStock!: number;

  @Prop({ required: true })
  newStock!: number;

  @Prop()
  note?: string;

  @Prop()
  reason?: string;

  @Prop()
  interventionId?: string;

  @Prop()
  caseId?: string;

  @Prop()
  actorUserId?: string;

  @Prop()
  actorUserName?: string;
}

export const StockMovementSchema = SchemaFactory.createForClass(StockMovementDocument);
StockMovementSchema.index({ organizationId: 1, articleId: 1, createdAt: -1 });
StockMovementSchema.index({ organizationId: 1, interventionId: 1, createdAt: -1 });
StockMovementSchema.index({ organizationId: 1, caseId: 1, createdAt: -1 });
