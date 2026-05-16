import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: true, _id: true, collection: "users" })
export class UserDocument extends Document {
  @Prop({ required: true })
  organizationId!: string;

  @Prop({ required: true })
  email!: string;

  @Prop()
  passwordHash?: string;

  @Prop()
  name?: string;

  @Prop({ required: true, enum: ["active", "invited"], default: "active" })
  status!: "active" | "invited";

  @Prop()
  invitedByUserId?: string;

  @Prop({ type: Date })
  deletedAt?: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(UserDocument);
UserSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
