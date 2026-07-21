import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: false, _id: true, collection: "cron_runs" })
export class CronRunDocument extends Document {
  @Prop({ required: true, index: true })
  jobKey!: string;

  @Prop({ required: true })
  service!: string;

  @Prop({ required: true, enum: ["running", "ok", "error", "skipped"] })
  status!: "running" | "ok" | "error" | "skipped";

  @Prop({ required: true, index: true })
  startedAt!: Date;

  @Prop()
  finishedAt?: Date;

  @Prop()
  durationMs?: number;

  @Prop({ type: Object })
  stats?: Record<string, unknown>;

  @Prop()
  errorMessage?: string;
}

export const CronRunSchema = SchemaFactory.createForClass(CronRunDocument);
CronRunSchema.index({ jobKey: 1, startedAt: -1 });
/** Conservation ~90 jours. */
CronRunSchema.index({ startedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
