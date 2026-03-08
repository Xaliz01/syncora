import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import type { DossierPriority, DossierStatus, TodoItemStatus } from "@syncora/shared";

@Schema({ _id: false })
export class DossierTodoItemSubDoc {
  @Prop({ type: String, default: () => new Types.ObjectId().toHexString() })
  id!: string;

  @Prop({ required: true })
  label!: string;

  @Prop()
  description?: string;

  @Prop({ type: String, default: "pending" })
  status!: TodoItemStatus;

  @Prop()
  completedAt?: Date;

  @Prop()
  completedBy?: string;
}

export const DossierTodoItemSubDocSchema =
  SchemaFactory.createForClass(DossierTodoItemSubDoc);

@Schema({ _id: false })
export class DossierStepSubDoc {
  @Prop({ type: String, default: () => new Types.ObjectId().toHexString() })
  id!: string;

  @Prop({ required: true })
  name!: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  order!: number;

  @Prop({ type: [DossierTodoItemSubDocSchema], default: [] })
  todos!: DossierTodoItemSubDoc[];
}

export const DossierStepSubDocSchema =
  SchemaFactory.createForClass(DossierStepSubDoc);

@Schema({ timestamps: true, _id: true })
export class DossierDocument extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true })
  organizationId!: string;

  @Prop()
  templateId?: string;

  @Prop({ required: true })
  title!: string;

  @Prop()
  description?: string;

  @Prop({ type: String, default: "draft" })
  status!: DossierStatus;

  @Prop({ type: String, default: "medium" })
  priority!: DossierPriority;

  @Prop()
  assigneeId?: string;

  @Prop()
  assigneeName?: string;

  @Prop()
  dueDate?: Date;

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop({ type: [DossierStepSubDocSchema], default: [] })
  steps!: DossierStepSubDoc[];

  @Prop({ default: 0 })
  interventionCount!: number;
}

export const DossierSchema = SchemaFactory.createForClass(DossierDocument);
DossierSchema.index({ organizationId: 1, status: 1 });
DossierSchema.index({ organizationId: 1, assigneeId: 1 });
DossierSchema.index({ organizationId: 1, dueDate: 1 });
