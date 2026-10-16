import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import type { DataImportEntity, DataImportRunStatus } from "@planwise/shared";

@Schema({ timestamps: false, collection: "data_import_runs" })
export class DataImportRunDocument extends Document {
  @Prop({ required: true, index: true })
  organizationId!: string;

  @Prop({ required: true })
  entity!: DataImportEntity;

  @Prop()
  fileName?: string;

  @Prop({ required: true })
  createdByUserId!: string;

  @Prop({ required: true })
  createdAt!: Date;

  @Prop({ required: true, enum: ["completed", "rolled_back"] })
  status!: DataImportRunStatus;

  @Prop()
  rolledBackAt?: Date;

  @Prop({ type: Object, required: true })
  stats!: {
    created: number;
    updated: number;
    skipped: number;
    errorCount: number;
  };

  @Prop({ type: [String], default: [] })
  createdResourceIds!: string[];
}

export const DataImportRunSchema = SchemaFactory.createForClass(DataImportRunDocument);
DataImportRunSchema.index({ organizationId: 1, createdAt: -1 });
/** Conservation ~180 jours. */
DataImportRunSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });
