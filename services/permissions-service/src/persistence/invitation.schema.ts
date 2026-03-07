import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import type { PermissionCode } from "@syncora/shared";

@Schema({ timestamps: true, _id: true })
export class InvitationDocument extends Document {
  @Prop({ required: true })
  organizationId!: string;

  @Prop({ required: true })
  invitedUserId!: string;

  @Prop({ required: true })
  invitedEmail!: string;

  @Prop()
  invitedName?: string;

  @Prop({ required: true })
  invitedByUserId!: string;

  @Prop({ required: true, enum: ["pending", "accepted", "cancelled"], default: "pending" })
  status!: "pending" | "accepted" | "cancelled";

  @Prop({ required: true, unique: true })
  invitationToken!: string;

  @Prop()
  profileId?: string;

  @Prop({ type: [String], required: true, default: [] })
  extraPermissions!: PermissionCode[];

  @Prop({ type: [String], required: true, default: [] })
  revokedPermissions!: PermissionCode[];

  @Prop()
  acceptedAt?: Date;
}

export const InvitationSchema = SchemaFactory.createForClass(InvitationDocument);
InvitationSchema.index(
  { organizationId: 1, invitedEmail: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);
