import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

@Schema({ timestamps: false, _id: true, collection: "user_sessions" })
export class UserSessionDocument extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true })
  sessionId!: string;

  @Prop({ required: true })
  label!: string;

  /** "desktop" | "mobile" — au plus une session active par classe et par user. */
  @Prop({ required: true, enum: ["desktop", "mobile"] })
  deviceClass!: "desktop" | "mobile";

  @Prop()
  userAgent?: string;

  @Prop({ type: Date, required: true })
  createdAt!: Date;

  @Prop({ type: Date, required: true })
  lastSeenAt!: Date;
}

export const UserSessionSchema = SchemaFactory.createForClass(UserSessionDocument);

UserSessionSchema.index({ userId: 1, sessionId: 1 }, { unique: true });
UserSessionSchema.index(
  { userId: 1, deviceClass: 1 },
  { unique: true, partialFilterExpression: { deviceClass: { $exists: true } } },
);
UserSessionSchema.index({ userId: 1, lastSeenAt: -1 });
