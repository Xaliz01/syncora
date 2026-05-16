import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { Types } from "mongoose";
import * as bcrypt from "bcrypt";
import type { UserDocument } from "../persistence/user.schema";
import type { OrganizationMembershipDocument } from "../persistence/organization-membership.schema";
import type { UserPreferencesDocument } from "../persistence/user-preferences.schema";
import {
  activeDocumentFilter,
  DEFAULT_USER_PREFERENCES,
  type ActivateInvitedUserBody,
  type ChangePasswordBody,
  type CreateInvitedUserBody,
  type CreateOrganizationMembershipBody,
  type CreateUserBody,
  type OrganizationMembershipResponse,
  type PatchUserBody,
  type UpdateUserNameBody,
  type UpdateUserPreferencesBody,
  type UserPreferencesResponse,
  type UserResponse,
  type UserRole,
  type ValidateCredentialsResponse,
} from "@syncora/shared";
import { AbstractUsersService } from "./ports/users.service.port";

const SALT_ROUNDS = 10;
const DEFAULT_ROLE: UserRole = "member";

@Injectable()
export class UsersService extends AbstractUsersService {
  constructor(
    @InjectModel("User") private readonly userModel: Model<UserDocument>,
    @InjectModel("OrganizationMembership")
    private readonly membershipModel: Model<OrganizationMembershipDocument>,
    @InjectModel("UserPreferences")
    private readonly preferencesModel: Model<UserPreferencesDocument>,
  ) {
    super();
  }

  async create(body: CreateUserBody): Promise<UserResponse> {
    const existing = await this.userModel
      .findOne({ email: body.email, ...activeDocumentFilter })
      .exec();
    if (existing) {
      throw new ConflictException("User with this email already exists");
    }
    const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);
    const doc = await this.userModel.create({
      organizationId: body.organizationId,
      email: body.email,
      passwordHash,
      name: body.name,
      status: "active",
    });
    const uid = doc._id.toString();
    await this.membershipModel.findOneAndUpdate(
      { userId: uid, organizationId: body.organizationId },
      {
        $set: {
          role: body.role,
          membershipStatus: "active",
          deletedAt: null,
        },
        $setOnInsert: { userId: uid, organizationId: body.organizationId },
      },
      { upsert: true, new: true },
    );
    return this.toResponseForOrganization(doc, body.organizationId);
  }

  async invite(body: CreateInvitedUserBody): Promise<UserResponse> {
    const existing = await this.userModel
      .findOne({ email: body.email, ...activeDocumentFilter })
      .exec();
    if (existing) {
      throw new ConflictException("User with this email already exists");
    }
    const invitedRole = body.role ?? DEFAULT_ROLE;
    const doc = await this.userModel.create({
      organizationId: body.organizationId,
      email: body.email,
      name: body.name,
      status: "active",
      invitedByUserId: body.invitedByUserId,
    });
    const uid = doc._id.toString();
    await this.membershipModel.findOneAndUpdate(
      { userId: uid, organizationId: body.organizationId },
      {
        $set: {
          role: invitedRole,
          membershipStatus: "invited",
          deletedAt: null,
        },
        $setOnInsert: { userId: uid, organizationId: body.organizationId },
      },
      { upsert: true, new: true },
    );
    return this.toResponseForOrganization(doc, body.organizationId);
  }

  async activateInvitedUser(id: string, body: ActivateInvitedUserBody): Promise<UserResponse> {
    const doc = await this.userModel.findOne({ _id: id, ...activeDocumentFilter }).exec();
    if (!doc) throw new NotFoundException("User not found");

    const uid = doc._id.toString();
    await this.ensureMembershipsBackfill(doc);

    const pending = await this.membershipModel
      .findOne({
        userId: uid,
        organizationId: doc.organizationId,
        membershipStatus: "invited",
        deletedAt: null,
      })
      .exec();
    if (!pending) {
      throw new BadRequestException(
        "Aucune invitation en attente pour cette organisation (statut géré via organization_memberships).",
      );
    }

    doc.passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);
    if (body.name) doc.name = body.name;
    await doc.save();

    await this.membershipModel.updateMany(
      { userId: uid, organizationId: doc.organizationId, deletedAt: null },
      { $set: { membershipStatus: "active" } },
    );

    return this.toResponseForOrganization(doc, doc.organizationId);
  }

  async patch(id: string, body: PatchUserBody): Promise<UserResponse> {
    if (body.organizationId === undefined) {
      throw new BadRequestException("organizationId is required");
    }
    const doc = await this.userModel
      .findOneAndUpdate(
        { _id: id, ...activeDocumentFilter },
        { $set: { organizationId: body.organizationId } },
        { new: true },
      )
      .exec();
    if (!doc) throw new NotFoundException("User not found");
    return this.toResponseForOrganization(doc, body.organizationId);
  }

  async findById(id: string): Promise<UserResponse | null> {
    const doc = await this.userModel.findOne({ _id: id, ...activeDocumentFilter }).exec();
    if (!doc) return null;
    await this.ensureMembershipsBackfill(doc);
    return this.toResponseForOrganization(doc, doc.organizationId);
  }

  async listByOrganization(organizationId: string): Promise<UserResponse[]> {
    const memberships = await this.membershipModel
      .find({ organizationId, deletedAt: null })
      .sort({ createdAt: 1 })
      .exec();

    const userIds = memberships.map((m) => m.userId);
    if (userIds.length === 0) return [];

    const users = await this.userModel
      .find({ _id: { $in: userIds }, ...activeDocumentFilter })
      .exec();

    const byId = new Map(users.map((u) => [u._id.toString(), u]));

    const out: UserResponse[] = [];
    for (const m of memberships) {
      const u = byId.get(m.userId);
      if (!u) continue;
      out.push({
        ...this.toBaseResponse(u),
        role: m.role as UserResponse["role"],
        organizationMembershipStatus:
          m.membershipStatus as UserResponse["organizationMembershipStatus"],
      });
    }
    return out;
  }

  async listOrganizationMemberships(userId: string): Promise<OrganizationMembershipResponse[]> {
    await this.ensureMembershipsBackfillByUserId(userId);
    const rows = await this.membershipModel
      .find({ userId, deletedAt: null })
      .sort({ createdAt: 1 })
      .exec();
    return rows.map((r) => this.membershipToResponse(r));
  }

  async addOrganizationMembership(
    userId: string,
    body: CreateOrganizationMembershipBody,
  ): Promise<OrganizationMembershipResponse> {
    if (!body.organizationId?.trim()) {
      throw new BadRequestException("organizationId is required");
    }
    const user = await this.userModel.findOne({ _id: userId, ...activeDocumentFilter }).exec();
    if (!user) throw new NotFoundException("User not found");

    const doc = await this.membershipModel.findOneAndUpdate(
      { userId, organizationId: body.organizationId.trim() },
      {
        $set: {
          role: body.role,
          membershipStatus: body.membershipStatus ?? "active",
          deletedAt: null,
        },
        $setOnInsert: { userId, organizationId: body.organizationId.trim() },
      },
      { upsert: true, new: true },
    );
    if (!doc) {
      throw new BadRequestException("Impossible de créer le rattachement organisation.");
    }
    return this.membershipToResponse(doc);
  }

  async updateName(id: string, body: UpdateUserNameBody): Promise<UserResponse> {
    if (!body.name?.trim()) {
      throw new BadRequestException("Le nom est requis");
    }
    const doc = await this.userModel
      .findOneAndUpdate(
        { _id: id, ...activeDocumentFilter },
        { $set: { name: body.name.trim() } },
        { new: true },
      )
      .exec();
    if (!doc) throw new NotFoundException("User not found");
    return this.toResponseForOrganization(doc, doc.organizationId);
  }

  async changePassword(id: string, body: ChangePasswordBody): Promise<void> {
    if (!body.newPassword?.trim()) {
      throw new BadRequestException("Le nouveau mot de passe est requis");
    }
    const doc = await this.userModel.findOne({ _id: id, ...activeDocumentFilter }).exec();
    if (!doc) throw new NotFoundException("User not found");
    if (!doc.passwordHash) {
      throw new BadRequestException("Ce compte n'a pas de mot de passe défini");
    }
    const ok = await bcrypt.compare(body.currentPassword, doc.passwordHash);
    if (!ok) {
      throw new UnauthorizedException("Mot de passe actuel incorrect");
    }
    doc.passwordHash = await bcrypt.hash(body.newPassword, SALT_ROUNDS);
    await doc.save();
  }

  async getPreferences(userId: string): Promise<UserPreferencesResponse> {
    const doc = await this.preferencesModel.findOne({ userId }).exec();
    if (!doc) {
      return { userId, preferences: { ...DEFAULT_USER_PREFERENCES } };
    }
    return {
      userId: doc.userId,
      preferences: {
        theme: doc.theme,
        sidebarCollapsed: doc.sidebarCollapsed,
      },
    };
  }

  async updatePreferences(
    userId: string,
    body: UpdateUserPreferencesBody,
  ): Promise<UserPreferencesResponse> {
    const user = await this.userModel.findOne({ _id: userId, ...activeDocumentFilter }).exec();
    if (!user) throw new NotFoundException("User not found");

    const $set: Record<string, unknown> = {};
    if (body.theme !== undefined) $set.theme = body.theme;
    if (body.sidebarCollapsed !== undefined) $set.sidebarCollapsed = body.sidebarCollapsed;

    const doc = await this.preferencesModel
      .findOneAndUpdate(
        { userId },
        {
          $set,
          $setOnInsert: {
            userId,
            ...(body.theme === undefined ? { theme: DEFAULT_USER_PREFERENCES.theme } : {}),
            ...(body.sidebarCollapsed === undefined
              ? { sidebarCollapsed: DEFAULT_USER_PREFERENCES.sidebarCollapsed }
              : {}),
          },
        },
        { upsert: true, new: true },
      )
      .exec();

    return {
      userId: doc!.userId,
      preferences: {
        theme: doc!.theme,
        sidebarCollapsed: doc!.sidebarCollapsed,
      },
    };
  }

  async validateCredentials(
    email: string,
    password: string,
  ): Promise<ValidateCredentialsResponse | null> {
    const doc = await this.userModel.findOne({ email, ...activeDocumentFilter }).exec();
    if (!doc) return null;
    if (!doc.passwordHash) return null;
    const ok = await bcrypt.compare(password, doc.passwordHash);
    if (!ok) return null;

    await this.ensureMembershipsBackfill(doc);

    const uid = doc._id.toString();
    const m = await this.membershipModel
      .findOne({
        userId: uid,
        organizationId: doc.organizationId,
        deletedAt: null,
      })
      .exec();
    if (!m || m.membershipStatus === "invited") {
      return null;
    }

    return {
      id: uid,
      organizationId: doc.organizationId,
      email: doc.email,
      name: doc.name,
      role: m.role as ValidateCredentialsResponse["role"],
      status: doc.status,
    };
  }

  private membershipToResponse(
    doc: OrganizationMembershipDocument,
  ): OrganizationMembershipResponse {
    return {
      id: doc._id.toString(),
      userId: doc.userId,
      organizationId: doc.organizationId,
      role: doc.role as OrganizationMembershipResponse["role"],
      membershipStatus: doc.membershipStatus as OrganizationMembershipResponse["membershipStatus"],
      createdAt: doc.get("createdAt")?.toISOString(),
      updatedAt: doc.get("updatedAt")?.toISOString(),
    };
  }

  /** Migre les anciens champs (users.role, linkedOrganizationIds) vers organization_memberships. */
  private async ensureMembershipsBackfillByUserId(userId: string): Promise<void> {
    const doc = await this.userModel.findOne({ _id: userId, ...activeDocumentFilter }).exec();
    if (doc) await this.ensureMembershipsBackfill(doc);
  }

  private async ensureMembershipsBackfill(doc: UserDocument): Promise<void> {
    const uid = doc._id.toString();
    const count = await this.membershipModel
      .countDocuments({ userId: uid, deletedAt: null })
      .exec();
    if (count > 0) return;

    const raw = await this.userModel.collection.findOne({ _id: new Types.ObjectId(uid) });
    const legacyRole = (raw?.role as UserRole | undefined) ?? DEFAULT_ROLE;
    const legacyLinked =
      (raw?.linkedOrganizationIds as string[] | undefined)?.filter(Boolean) ?? [];

    await this.membershipModel.findOneAndUpdate(
      { userId: uid, organizationId: doc.organizationId },
      {
        $set: {
          role: legacyRole,
          membershipStatus: doc.status === "invited" ? "invited" : "active",
          deletedAt: null,
        },
        $setOnInsert: { userId: uid, organizationId: doc.organizationId },
      },
      { upsert: true, new: true },
    );

    for (const oid of legacyLinked) {
      if (oid === doc.organizationId) continue;
      await this.membershipModel.findOneAndUpdate(
        { userId: uid, organizationId: oid },
        {
          $set: {
            role: legacyRole,
            membershipStatus: "active",
            deletedAt: null,
          },
          $setOnInsert: { userId: uid, organizationId: oid },
        },
        { upsert: true, new: true },
      );
    }

    const unset: Record<string, string> = {};
    if (legacyLinked.length > 0) unset.linkedOrganizationIds = "";
    if (raw?.role !== undefined) unset.role = "";
    if (Object.keys(unset).length > 0) {
      await this.userModel.collection.updateOne({ _id: doc._id }, { $unset: unset });
    }
  }

  private async requireRoleForOrganization(
    userId: string,
    organizationId: string,
  ): Promise<UserRole> {
    const m = await this.membershipModel
      .findOne({ userId, organizationId, deletedAt: null })
      .exec();
    if (!m) {
      throw new NotFoundException(
        "Aucun rattachement organisation pour cet utilisateur (organization_memberships).",
      );
    }
    return m.role as UserRole;
  }

  private async toResponseForOrganization(
    doc: UserDocument,
    organizationId: string,
  ): Promise<UserResponse> {
    const role = await this.requireRoleForOrganization(doc._id.toString(), organizationId);
    return { ...this.toBaseResponse(doc), role };
  }

  private toBaseResponse(doc: UserDocument): Omit<UserResponse, "role"> {
    return {
      id: doc._id.toString(),
      organizationId: doc.organizationId,
      email: doc.email,
      name: doc.name,
      status: doc.status,
      createdAt: doc.get("createdAt")?.toISOString(),
    };
  }
}
