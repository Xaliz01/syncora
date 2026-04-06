import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { randomUUID } from "crypto";
import {
  ASSIGNABLE_PERMISSION_CODES,
  activeDocumentFilter,
  type AssignUserPermissionsBody,
  type CreateInvitationBody,
  type CreatePermissionProfileBody,
  type EffectivePermissionsResponse,
  type InvitationResponse,
  type PermissionCode,
  type PermissionProfileResponse,
  type ResolveEffectivePermissionsBody,
  type UpdatePermissionProfileBody,
  type UserPermissionAssignmentResponse,
  type UserRole
} from "@syncora/shared";
import type { PermissionProfileDocument } from "../persistence/permission-profile.schema";
import type { UserPermissionAssignmentDocument } from "../persistence/user-permission-assignment.schema";
import type { InvitationDocument } from "../persistence/invitation.schema";
import { AbstractPermissionsService } from "./ports/permissions.service.port";

const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, PermissionCode[]> = {
  admin: [...ASSIGNABLE_PERMISSION_CODES],
  member: []
};

@Injectable()
export class PermissionsService extends AbstractPermissionsService {
  constructor(
    @InjectModel("PermissionProfile")
    private readonly permissionProfileModel: Model<PermissionProfileDocument>,
    @InjectModel("UserPermissionAssignment")
    private readonly userAssignmentModel: Model<UserPermissionAssignmentDocument>,
    @InjectModel("Invitation")
    private readonly invitationModel: Model<InvitationDocument>
  ) {
    super();
  }

  async createProfile(body: CreatePermissionProfileBody): Promise<PermissionProfileResponse> {
    const permissions = this.normalizePermissions(body.permissions);
    try {
      const doc = await this.permissionProfileModel.create({
        organizationId: body.organizationId,
        name: body.name,
        description: body.description,
        permissions
      });
      return this.toProfileResponse(doc);
    } catch (err: unknown) {
      if (this.isDuplicateKeyError(err)) {
        throw new ConflictException("Profile name already exists in organization");
      }
      throw err;
    }
  }

  async listProfiles(organizationId: string): Promise<PermissionProfileResponse[]> {
    const docs = await this.permissionProfileModel
      .find({ organizationId, ...activeDocumentFilter })
      .sort({ createdAt: 1 })
      .exec();
    return docs.map((doc) => this.toProfileResponse(doc));
  }

  async findProfileById(
    id: string,
    organizationId: string
  ): Promise<PermissionProfileResponse> {
    const doc = await this.permissionProfileModel
      .findOne({ _id: id, organizationId, ...activeDocumentFilter })
      .exec();
    if (!doc) throw new NotFoundException("Profile not found");
    return this.toProfileResponse(doc);
  }

  async updateProfile(
    id: string,
    body: UpdatePermissionProfileBody
  ): Promise<PermissionProfileResponse> {
    const update: Partial<{
      name: string;
      description?: string;
      permissions: PermissionCode[];
    }> = {};
    if (typeof body.name !== "undefined") update.name = body.name;
    if (typeof body.description !== "undefined") update.description = body.description;
    if (typeof body.permissions !== "undefined") {
      update.permissions = this.normalizePermissions(body.permissions);
    }
    try {
      const doc = await this.permissionProfileModel
        .findOneAndUpdate(
          { _id: id, organizationId: body.organizationId, ...activeDocumentFilter },
          { $set: update },
          { new: true }
        )
        .exec();
      if (!doc) throw new NotFoundException("Profile not found");
      return this.toProfileResponse(doc);
    } catch (err: unknown) {
      if (this.isDuplicateKeyError(err)) {
        throw new ConflictException("Profile name already exists in organization");
      }
      throw err;
    }
  }

  async deleteProfile(id: string, organizationId: string): Promise<{ deleted: true }> {
    const result = await this.permissionProfileModel
      .updateOne(
        { _id: id, organizationId, ...activeDocumentFilter },
        { $set: { deletedAt: new Date() } }
      )
      .exec();
    if (!result.matchedCount) throw new NotFoundException("Profile not found");
    await this.userAssignmentModel.updateMany(
      { organizationId, profileId: id },
      { $unset: { profileId: 1 } }
    );
    await this.invitationModel.updateMany(
      { organizationId, profileId: id, status: "pending" },
      { $unset: { profileId: 1 } }
    );
    return { deleted: true };
  }

  async assignUserPermissions(
    body: AssignUserPermissionsBody
  ): Promise<UserPermissionAssignmentResponse> {
    const extraPermissions = this.normalizePermissions(body.extraPermissions ?? []);
    const revokedPermissions = this.normalizePermissions(body.revokedPermissions ?? []);
    const profileId = body.profileId ?? undefined;
    let profilePermissions: PermissionCode[] = [];
    if (profileId) {
      const profile = await this.permissionProfileModel
        .findOne({
          _id: profileId,
          organizationId: body.organizationId,
          ...activeDocumentFilter
        })
        .exec();
      if (!profile) {
        throw new NotFoundException("Profile not found in this organization");
      }
      profilePermissions = profile.permissions as PermissionCode[];
    }

    const doc = await this.userAssignmentModel
      .findOneAndUpdate(
        { organizationId: body.organizationId, userId: body.userId },
        {
          $set: {
            profileId,
            extraPermissions,
            revokedPermissions
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
      .exec();
    return this.toAssignmentResponse(doc, profilePermissions);
  }

  async getUserAssignment(
    organizationId: string,
    userId: string
  ): Promise<UserPermissionAssignmentResponse> {
    const assignment = await this.userAssignmentModel
      .findOne({ organizationId, userId })
      .exec();
    if (!assignment) {
      return {
        organizationId,
        userId,
        extraPermissions: [],
        revokedPermissions: [],
        effectivePermissions: []
      };
    }
    const profilePermissions = await this.getProfilePermissions(
      organizationId,
      assignment.profileId
    );
    return this.toAssignmentResponse(assignment, profilePermissions);
  }

  async resolveEffectivePermissions(
    body: ResolveEffectivePermissionsBody
  ): Promise<EffectivePermissionsResponse> {
    // Admin users always keep the full permission set for their organization.
    if (body.role === "admin") {
      return { permissions: [...ASSIGNABLE_PERMISSION_CODES] };
    }
    const defaultPermissions = ROLE_DEFAULT_PERMISSIONS[body.role] ?? [];
    const assignment = await this.userAssignmentModel
      .findOne({ organizationId: body.organizationId, userId: body.userId })
      .exec();
    if (!assignment) {
      return { permissions: this.normalizePermissions(defaultPermissions) };
    }

    const profilePermissions = await this.getProfilePermissions(
      body.organizationId,
      assignment.profileId
    );
    const merged = this.mergePermissions(defaultPermissions, profilePermissions);
    const plusExtra = this.mergePermissions(merged, assignment.extraPermissions as PermissionCode[]);
    const permissions = plusExtra.filter(
      (permission) => !(assignment.revokedPermissions as PermissionCode[]).includes(permission)
    );
    return { permissions: this.normalizePermissions(permissions) };
  }

  async createInvitation(body: CreateInvitationBody): Promise<InvitationResponse> {
    const profileId = body.profileId;
    if (profileId) {
      const profile = await this.permissionProfileModel
        .findOne({
          _id: profileId,
          organizationId: body.organizationId,
          ...activeDocumentFilter
        })
        .exec();
      if (!profile) throw new NotFoundException("Profile not found in this organization");
    }
    const extraPermissions = this.normalizePermissions(body.extraPermissions ?? []);
    const revokedPermissions = this.normalizePermissions(body.revokedPermissions ?? []);
    try {
      const doc = await this.invitationModel.create({
        organizationId: body.organizationId,
        invitedUserId: body.invitedUserId,
        invitedEmail: body.invitedEmail,
        invitedName: body.invitedName,
        invitedByUserId: body.invitedByUserId,
        profileId,
        extraPermissions,
        revokedPermissions,
        invitationToken: randomUUID(),
        status: "pending"
      });
      return this.toInvitationResponse(doc);
    } catch (err: unknown) {
      if (this.isDuplicateKeyError(err)) {
        throw new ConflictException("A pending invitation already exists for this email");
      }
      throw err;
    }
  }

  async listInvitations(
    organizationId: string,
    status?: "pending" | "accepted" | "cancelled"
  ): Promise<InvitationResponse[]> {
    const query: { organizationId: string; status?: "pending" | "accepted" | "cancelled" } = {
      organizationId
    };
    if (status) query.status = status;
    const docs = await this.invitationModel.find(query).sort({ createdAt: -1 }).exec();
    return docs.map((doc) => this.toInvitationResponse(doc));
  }

  async resolveInvitation(invitationToken: string): Promise<InvitationResponse> {
    const doc = await this.invitationModel.findOne({ invitationToken }).exec();
    if (!doc) throw new NotFoundException("Invitation not found");
    if (doc.status !== "pending") {
      throw new ConflictException("Invitation has already been processed");
    }
    return this.toInvitationResponse(doc);
  }

  async acceptInvitation(invitationToken: string): Promise<InvitationResponse> {
    const doc = await this.invitationModel.findOne({ invitationToken, status: "pending" }).exec();
    if (!doc) throw new NotFoundException("Pending invitation not found");
    doc.status = "accepted";
    doc.acceptedAt = new Date();
    await doc.save();
    return this.toInvitationResponse(doc);
  }

  private async getProfilePermissions(
    organizationId: string,
    profileId?: string
  ): Promise<PermissionCode[]> {
    if (!profileId) return [];
    const profile = await this.permissionProfileModel
      .findOne({ _id: profileId, organizationId, ...activeDocumentFilter })
      .exec();
    if (!profile) return [];
    return this.normalizePermissions(profile.permissions as PermissionCode[]);
  }

  private normalizePermissions(permissions: PermissionCode[]): PermissionCode[] {
    const knownPermissions = new Set<PermissionCode>(ASSIGNABLE_PERMISSION_CODES);
    const invalid = permissions.filter((permission) => !knownPermissions.has(permission));
    if (invalid.length > 0) {
      throw new BadRequestException(`Unknown permissions: ${invalid.join(", ")}`);
    }
    return [...new Set(permissions)];
  }

  private mergePermissions(
    first: PermissionCode[],
    second: PermissionCode[]
  ): PermissionCode[] {
    return [...new Set([...first, ...second])];
  }

  private toProfileResponse(doc: PermissionProfileDocument): PermissionProfileResponse {
    return {
      id: doc._id.toString(),
      organizationId: doc.organizationId,
      name: doc.name,
      description: doc.description,
      permissions: this.normalizePermissions(doc.permissions as PermissionCode[]),
      createdAt: doc.get("createdAt")?.toISOString(),
      updatedAt: doc.get("updatedAt")?.toISOString()
    };
  }

  private toAssignmentResponse(
    doc: UserPermissionAssignmentDocument,
    profilePermissions: PermissionCode[]
  ): UserPermissionAssignmentResponse {
    const extraPermissions = this.normalizePermissions(doc.extraPermissions as PermissionCode[]);
    const revokedPermissions = this.normalizePermissions(doc.revokedPermissions as PermissionCode[]);
    const effectivePermissions = this.mergePermissions(profilePermissions, extraPermissions).filter(
      (permission) => !revokedPermissions.includes(permission)
    );
    return {
      organizationId: doc.organizationId,
      userId: doc.userId,
      profileId: doc.profileId,
      extraPermissions,
      revokedPermissions,
      effectivePermissions: this.normalizePermissions(effectivePermissions),
      updatedAt: doc.get("updatedAt")?.toISOString()
    };
  }

  private toInvitationResponse(doc: InvitationDocument): InvitationResponse {
    return {
      id: doc._id.toString(),
      organizationId: doc.organizationId,
      invitedUserId: doc.invitedUserId,
      invitedEmail: doc.invitedEmail,
      invitedName: doc.invitedName,
      invitedByUserId: doc.invitedByUserId,
      status: doc.status,
      invitationToken: doc.invitationToken,
      profileId: doc.profileId,
      extraPermissions: this.normalizePermissions(doc.extraPermissions as PermissionCode[]),
      revokedPermissions: this.normalizePermissions(doc.revokedPermissions as PermissionCode[]),
      createdAt: doc.get("createdAt")?.toISOString(),
      acceptedAt: doc.acceptedAt?.toISOString()
    };
  }

  private isDuplicateKeyError(err: unknown): boolean {
    return (err as { code?: number })?.code === 11000;
  }
}
