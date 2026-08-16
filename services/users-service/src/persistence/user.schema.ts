import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: true, _id: true, collection: "users" })
export class UserDocument extends Document {
  @Prop()
  organizationId?: string;

  @Prop({ required: true })
  email!: string;

  @Prop()
  passwordHash?: string;

  @Prop()
  name?: string;

  @Prop({ required: true, enum: ["active", "invited"], default: "active" })
  status!: "active" | "invited";

  /**
   * Compte self-service : false jusqu'à validation OTP.
   * Absent / true pour les comptes legacy et les invitations.
   */
  @Prop({ default: true })
  emailVerified!: boolean;

  @Prop()
  emailVerificationCodeHash?: string;

  @Prop({ type: Date })
  emailVerificationExpiresAt?: Date | null;

  @Prop({ type: Date })
  emailVerificationSentAt?: Date | null;

  /** SHA-256 hex du jeton de reset (jamais le jeton en clair). */
  @Prop()
  passwordResetTokenHash?: string;

  @Prop({ type: Date })
  passwordResetExpiresAt?: Date | null;

  @Prop({ type: Date })
  passwordResetSentAt?: Date | null;

  @Prop()
  invitedByUserId?: string;

  @Prop({ type: Date })
  deletedAt?: Date | null;

  @Prop({ type: Date })
  lastLoginAt?: Date | null;
}

export const UserSchema = SchemaFactory.createForClass(UserDocument);
UserSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });
UserSchema.index(
  { passwordResetTokenHash: 1 },
  {
    unique: true,
    partialFilterExpression: { passwordResetTokenHash: { $type: "string" } },
  },
);
