import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

/** Lien utilisateur ↔ organisation avec rôle et statut (invitations, droits). */
@Schema({ timestamps: true, _id: true, collection: "organization_memberships" })
export class OrganizationMembershipDocument extends Document {
  declare _id: Types.ObjectId;

  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  organizationId!: string;

  @Prop({ required: true, enum: ["admin", "member"], default: "member" })
  role!: string;

  /** Aligné sur le cycle invitation du user ; extensions futures (suspended, …). */
  @Prop({ required: true, enum: ["active", "invited"], default: "active" })
  membershipStatus!: "active" | "invited";

  @Prop({ type: Date })
  deletedAt?: Date | null;
}

export const OrganizationMembershipSchema = SchemaFactory.createForClass(
  OrganizationMembershipDocument,
);

OrganizationMembershipSchema.index(
  { userId: 1, organizationId: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);
OrganizationMembershipSchema.index({ organizationId: 1, deletedAt: 1 });
OrganizationMembershipSchema.index({ userId: 1, deletedAt: 1 });
