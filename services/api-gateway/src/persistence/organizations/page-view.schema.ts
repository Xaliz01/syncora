import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import type { AnalyticsSurface } from "@planwise/shared";

@Schema({ timestamps: { createdAt: true, updatedAt: false }, _id: true, collection: "page_views" })
export class PageViewDocument extends Document {
  @Prop({ required: true, enum: ["marketing", "app", "platform"] })
  surface!: AnalyticsSurface;

  @Prop({ required: true })
  path!: string;

  @Prop()
  referrerHost?: string;

  @Prop({ required: true, index: true })
  visitorId!: string;

  @Prop({ required: true, index: true })
  sessionId!: string;

  @Prop({ default: false })
  authenticated!: boolean;

  /** Domaine e-mail si session authentifiée (ex. `exemple.fr`) — exclusion KPI internes. */
  @Prop()
  emailDomain?: string;

  /** ISO 3166-1 alpha-2 dérivé serveur (pas d'IP stockée). */
  @Prop()
  country?: string;

  /** Code région approximatif dérivé serveur. */
  @Prop()
  region?: string;

  createdAt!: Date;
}

export const PageViewSchema = SchemaFactory.createForClass(PageViewDocument);
PageViewSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 400 });
PageViewSchema.index({ surface: 1, createdAt: -1 });
PageViewSchema.index({ path: 1, createdAt: -1 });
PageViewSchema.index({ country: 1, createdAt: -1 });
