import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import type { PermissionCode } from "@syncora/shared";

@Schema({ timestamps: true, _id: true })
export class UserPermissionAssignmentDocument extends Document {
  @Prop({ required: true })
  organizationId!: string;

  @Prop({ required: true })
  userId!: string;

  @Prop()
  profileId?: string;

  @Prop({ type: [String], required: true, default: [] })
  extraPermissions!: PermissionCode[];

  @Prop({ type: [String], required: true, default: [] })
  revokedPermissions!: PermissionCode[];
}

export const UserPermissionAssignmentSchema = SchemaFactory.createForClass(
  UserPermissionAssignmentDocument
);
UserPermissionAssignmentSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
