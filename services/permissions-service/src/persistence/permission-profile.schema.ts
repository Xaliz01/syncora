import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import type { PermissionCode } from "@syncora/shared";

@Schema({ timestamps: true, _id: true, collection: "permission_profiles" })
export class PermissionProfileDocument extends Document {
  @Prop({ required: true })
  organizationId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop()
  description?: string;

  @Prop({ type: [String], required: true, default: [] })
  permissions!: PermissionCode[];

  @Prop({ type: Date })
  deletedAt?: Date | null;
}

export const PermissionProfileSchema = SchemaFactory.createForClass(PermissionProfileDocument);
PermissionProfileSchema.index(
  { organizationId: 1, name: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
