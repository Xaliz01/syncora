import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ _id: false })
export class TemplateStepTodoSubDoc {
  @Prop({ required: true })
  label!: string;

  @Prop()
  description?: string;
}

export const TemplateStepTodoSubDocSchema = SchemaFactory.createForClass(TemplateStepTodoSubDoc);

@Schema({ _id: false })
export class TemplateStepSubDoc {
  @Prop({ required: true })
  name!: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  order!: number;

  @Prop({ type: [TemplateStepTodoSubDocSchema], default: [] })
  todos!: TemplateStepTodoSubDoc[];
}

export const TemplateStepSubDocSchema = SchemaFactory.createForClass(TemplateStepSubDoc);

@Schema({ timestamps: true, _id: true, collection: "case_templates" })
export class CaseTemplateDocument extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true })
  organizationId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop()
  description?: string;

  @Prop({ type: [TemplateStepSubDocSchema], default: [] })
  steps!: TemplateStepSubDoc[];

  @Prop({ type: Date })
  deletedAt?: Date | null;
}

export const CaseTemplateSchema = SchemaFactory.createForClass(CaseTemplateDocument);
CaseTemplateSchema.index(
  { organizationId: 1, name: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
