import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: true, _id: true })
export class TeamDocument extends Document {
  @Prop({ required: true })
  organizationId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop()
  agenceId?: string;

  @Prop({ type: [String], default: [] })
  technicianIds!: string[];

  @Prop({ required: true, default: "active" })
  status!: string;

  /** Hex #RRGGBB — cartes calendrier */
  @Prop()
  calendarColor?: string;
}

export const TeamSchema = SchemaFactory.createForClass(TeamDocument);
TeamSchema.index({ organizationId: 1, name: 1 }, { unique: true });
