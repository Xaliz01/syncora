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
import type { SupportImpersonationAuditDocument } from "../persistence/support-impersonation-audit.schema";
import {
  activeDocumentFilter,
  DEFAULT_USER_PREFERENCES,
  normalizeQuickActionIds,
  type ActivateInvitedUserBody,
  type ChangePasswordBody,
  type CreateAccountBody,
  type CreateInvitedUserBody,
  type CreateOrganizationMembershipBody,
  type CreateUserBody,
  type OrganizationMembershipResponse,
  type PatchUserBody,
  type AccountUserResponse,
  type PlatformUserSummary,
  type UpdateUserNameBody,
  type UpdateUserPreferencesBody,
  type UserPreferences,
  type UserPreferencesResponse,
  type UserResponse,
  type UserRole,
  type ValidateCredentialsResponse,
} from "@planwise/shared";
import {
  AbstractUsersService,
  type CreateImpersonationAuditBody,
  type PlatformUsersDirectoryResult,
} from "./ports/users.service.port";

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
    @InjectModel("SupportImpersonationAudit")
    private readonly impersonationAuditModel: Model<SupportImpersonationAuditDocument>,
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

  async createAccount(body: CreateAccountBody): Promise<AccountUserResponse> {
    const existing = await this.userModel
      .findOne({ email: body.email, ...activeDocumentFilter })
      .exec();
    if (existing) {
      throw new ConflictException("User with this email already exists");
    }
    const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);
    const doc = await this.userModel.create({
      email: body.email,
      passwordHash,
      name: body.name,
      status: "active",
    });
    return this.toAccountResponse(doc);
  }

  async findAccountById(id: string): Promise<AccountUserResponse | null> {
    const doc = await this.userModel.findOne({ _id: id, ...activeDocumentFilter }).exec();
    if (!doc) return null;
    return this.toAccountResponse(doc);
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

    return this.toResponseForOrganization(doc, doc.organizationId!);
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
    if (!doc.organizationId?.trim()) return null;
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
    if (!doc.organizationId?.trim()) {
      throw new BadRequestException("Organisation requise pour modifier le nom");
    }
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
      preferences: this.toPreferences(doc),
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
    if (body.quickActionIds !== undefined) {
      const normalized = normalizeQuickActionIds(body.quickActionIds);
      if (!normalized) {
        throw new BadRequestException(
          `quickActionIds must contain between 2 and 6 valid unique action ids`,
        );
      }
      $set.quickActionIds = normalized;
    }

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
            ...(body.quickActionIds === undefined
              ? { quickActionIds: [...DEFAULT_USER_PREFERENCES.quickActionIds] }
              : {}),
          },
        },
        { upsert: true, new: true },
      )
      .exec();

    return {
      userId: doc!.userId,
      preferences: this.toPreferences(doc!),
    };
  }

  private toPreferences(doc: UserPreferencesDocument): UserPreferences {
    const quickActionIds = normalizeQuickActionIds(doc.quickActionIds) ?? [
      ...DEFAULT_USER_PREFERENCES.quickActionIds,
    ];
    return {
      theme: doc.theme,
      sidebarCollapsed: doc.sidebarCollapsed,
      quickActionIds,
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

    doc.lastLoginAt = new Date();
    await doc.save();

    await this.ensureMembershipsBackfill(doc);

    const uid = doc._id.toString();
    if (!doc.organizationId?.trim()) {
      return {
        id: uid,
        email: doc.email,
        name: doc.name,
        status: doc.status,
      };
    }

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

  async listPlatformDirectory(filters?: {
    search?: string;
    organizationId?: string;
    limit?: number;
    offset?: number;
  }): Promise<PlatformUsersDirectoryResult> {
    const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 200);
    const offset = Math.max(filters?.offset ?? 0, 0);
    const query: Record<string, unknown> = { ...activeDocumentFilter };

    if (filters?.organizationId?.trim()) {
      query.organizationId = filters.organizationId.trim();
    }

    const search = filters?.search?.trim();
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { email: { $regex: escaped, $options: "i" } },
        { name: { $regex: escaped, $options: "i" } },
      ];
    }

    const [total, docs] = await Promise.all([
      this.userModel.countDocuments(query).exec(),
      this.userModel
        .find(query)
        .sort({ lastLoginAt: -1, createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .exec(),
    ]);

    const users: PlatformUserSummary[] = [];
    for (const doc of docs) {
      const uid = doc._id.toString();
      let role: UserRole | undefined;
      if (doc.organizationId?.trim()) {
        const m = await this.membershipModel
          .findOne({
            userId: uid,
            organizationId: doc.organizationId,
            deletedAt: null,
          })
          .exec();
        role = m?.role as UserRole | undefined;
      }
      users.push({
        id: uid,
        email: doc.email,
        name: doc.name,
        status: doc.status,
        organizationId: doc.organizationId || undefined,
        role,
        lastLoginAt: doc.lastLoginAt?.toISOString(),
        createdAt: doc.get("createdAt")?.toISOString(),
      });
    }

    return { users, total };
  }

  async countUsersByOrganizationIds(
    organizationIds: string[],
  ): Promise<Record<string, { userCount: number; lastUserLoginAt?: string }>> {
    const ids = [...new Set(organizationIds.map((id) => id.trim()).filter(Boolean))];
    const out: Record<string, { userCount: number; lastUserLoginAt?: string }> = {};
    for (const id of ids) {
      out[id] = { userCount: 0 };
    }
    if (ids.length === 0) return out;

    const memberships = await this.membershipModel
      .find({ organizationId: { $in: ids }, deletedAt: null, membershipStatus: "active" })
      .exec();

    const userIdsByOrg = new Map<string, Set<string>>();
    for (const m of memberships) {
      const set = userIdsByOrg.get(m.organizationId) ?? new Set<string>();
      set.add(m.userId);
      userIdsByOrg.set(m.organizationId, set);
    }

    const allUserIds = [...new Set(memberships.map((m) => m.userId))];
    const users =
      allUserIds.length === 0
        ? []
        : await this.userModel
            .find({ _id: { $in: allUserIds }, ...activeDocumentFilter })
            .select({ lastLoginAt: 1 })
            .exec();
    const lastLoginByUser = new Map(
      users.map((u) => [u._id.toString(), u.lastLoginAt?.toISOString()] as const),
    );

    for (const [orgId, userIds] of userIdsByOrg) {
      let lastUserLoginAt: string | undefined;
      for (const uid of userIds) {
        const login = lastLoginByUser.get(uid);
        if (login && (!lastUserLoginAt || login > lastUserLoginAt)) {
          lastUserLoginAt = login;
        }
      }
      out[orgId] = {
        userCount: userIds.size,
        ...(lastUserLoginAt ? { lastUserLoginAt } : {}),
      };
    }

    return out;
  }

  async createImpersonationAudit(body: CreateImpersonationAuditBody): Promise<{ id: string }> {
    const doc = await this.impersonationAuditModel.create({
      impersonatorUserId: body.impersonatorUserId,
      impersonatorEmail: body.impersonatorEmail.trim().toLowerCase(),
      targetUserId: body.targetUserId,
      targetEmail: body.targetEmail.trim().toLowerCase(),
      organizationId: body.organizationId,
      reason: body.reason.trim(),
      startedAt: new Date(),
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
    });
    return { id: doc._id.toString() };
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
    if (!doc.organizationId?.trim()) return;

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

  private toAccountResponse(doc: UserDocument): AccountUserResponse {
    return {
      id: doc._id.toString(),
      email: doc.email,
      name: doc.name,
      status: doc.status,
    };
  }

  private toBaseResponse(doc: UserDocument): Omit<UserResponse, "role"> {
    return {
      id: doc._id.toString(),
      organizationId: doc.organizationId!,
      email: doc.email,
      name: doc.name,
      status: doc.status,
      createdAt: doc.get("createdAt")?.toISOString(),
      lastLoginAt: doc.lastLoginAt?.toISOString(),
    };
  }
}
