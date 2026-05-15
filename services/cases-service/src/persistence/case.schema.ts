import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import type { CasePriority, CaseStatus, TodoItemStatus } from "@syncora/shared";

@Schema({ _id: false })
export class CaseTodoItemSubDoc {
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

export const CaseTodoItemSubDocSchema = SchemaFactory.createForClass(CaseTodoItemSubDoc);

@Schema({ _id: false })
export class CaseStepSubDoc {
  @Prop({ type: String, default: () => new Types.ObjectId().toHexString() })
  id!: string;

  @Prop({ required: true })
  name!: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  order!: number;

  @Prop({ type: [CaseTodoItemSubDocSchema], default: [] })
  todos!: CaseTodoItemSubDoc[];
}

export const CaseStepSubDocSchema = SchemaFactory.createForClass(CaseStepSubDoc);

@Schema({ _id: false })
export class CaseAssigneeSubDoc {
  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  name!: string;
}

export const CaseAssigneeSubDocSchema = SchemaFactory.createForClass(CaseAssigneeSubDoc);

@Schema({ timestamps: true, _id: true, collection: "cases" })
export class CaseDocument extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true })
  organizationId!: string;

  @Prop()
  templateId?: string;

  @Prop()
  customerId?: string;

  @Prop({ required: true })
  title!: string;

  @Prop()
  description?: string;

  @Prop({ type: String, default: "draft" })
  status!: CaseStatus;

  @Prop({ type: String, default: "medium" })
  priority!: CasePriority;

  @Prop()
  assigneeId?: string;

  @Prop()
  assigneeName?: string;

  @Prop({ type: [CaseAssigneeSubDocSchema], default: [] })
  assignees!: CaseAssigneeSubDoc[];

  @Prop()
  dueDate?: Date;

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop({ type: [CaseStepSubDocSchema], default: [] })
  steps!: CaseStepSubDoc[];

  @Prop({ default: 0 })
  interventionCount!: number;

  @Prop({ type: Date })
  deletedAt?: Date | null;
}

export const CaseSchema = SchemaFactory.createForClass(CaseDocument);
CaseSchema.index({ organizationId: 1, status: 1 });
CaseSchema.index({ organizationId: 1, assigneeId: 1 });
CaseSchema.index({ organizationId: 1, "assignees.userId": 1 });
CaseSchema.index({ organizationId: 1, dueDate: 1 });
