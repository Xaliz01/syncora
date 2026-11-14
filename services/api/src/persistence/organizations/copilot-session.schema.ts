import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import type {
  CopilotDecision,
  CopilotProposedAction,
  CopilotSessionStatus,
} from "@planwise/shared";

@Schema({ timestamps: true, collection: "copilot_sessions" })
export class CopilotSessionDocument extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true })
  organizationId!: string;

  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  userName!: string;

  @Prop({ required: true })
  transcript!: string;

  @Prop({ default: false })
  audioAvailable!: boolean;

  @Prop()
  audioMimeType?: string;

  @Prop({ type: Buffer })
  audioData?: Buffer;

  @Prop({ required: true })
  intent!: string;

  @Prop({ required: true })
  status!: CopilotSessionStatus;

  @Prop({ type: String, default: null })
  decision!: CopilotDecision | null;

  @Prop()
  message?: string;

  @Prop({ type: [Object], default: [] })
  actions!: CopilotProposedAction[];

  @Prop()
  approxTokens?: number;
}

export const CopilotSessionSchema = SchemaFactory.createForClass(CopilotSessionDocument);
CopilotSessionSchema.index(
  { organizationId: 1, createdAt: -1 },
  { name: "copilot_sessions_org_created" },
);
