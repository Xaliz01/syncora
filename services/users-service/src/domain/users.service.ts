import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { Types } from "mongoose";
import { randomInt } from "crypto";
import * as bcrypt from "bcrypt";
import type { UserDocument } from "../persistence/user.schema";
import type { OrganizationMembershipDocument } from "../persistence/organization-membership.schema";
import {
  activeDocumentFilter,
  getPasswordPolicyError,
  type ActivateInvitedUserBody,
  type ChangePasswordBody,
  type CreateAccountBody,
  type CreateAccountResult,
  type CreateInvitedUserBody,
  type CreateOrganizationMembershipBody,
  type CreateUserBody,
  type InvitationActivationHintsResponse,
  type IssueEmailVerificationResult,
  type OrganizationMembershipResponse,
  type PatchUserBody,
  type AccountUserResponse,
  PLATFORM_USER_ACTIVE_WITHIN_MS,
  type PlatformUserSummary,
  type UpdateUserNameBody,
  type UserResponse,
  type UserRole,
  type ValidateCredentialsResponse,
  platformMetricsExcludedEmailDomainRegex,
} from "@planwise/shared";
import {
  AbstractUsersService,
  type PlatformUsersDirectoryResult,
} from "./ports/users.service.port";
import { AbstractUserSessionsService } from "./ports/user-sessions.service.port";
import { toUserBaseResponse, toAccountUserResponse, isEmailVerified } from "./mappers/user.mapper";
import { toOrganizationMembershipResponse } from "./mappers/membership.mapper";

const SALT_ROUNDS = 12;
const DEFAULT_ROLE: UserRole = "member";
const EMAIL_OTP_TTL_MS = 15 * 60 * 1000;
const EMAIL_OTP_RESEND_COOLDOWN_MS = 60 * 1000;
/** Cap candidats avant filtre « en activité » (search / org). */
const PLATFORM_ACTIVE_CANDIDATE_CAP = 5000;

function assertPasswordPolicy(password: string): void {
  const error = getPasswordPolicyError(password);
  if (error) throw new BadRequestException(error);
}

@Injectable()
export class UsersService extends AbstractUsersService {
  constructor(
    @InjectModel("User") private readonly userModel: Model<UserDocument>,
    @InjectModel("OrganizationMembership")
    private readonly membershipModel: Model<OrganizationMembershipDocument>,
    private readonly sessionsService: AbstractUserSessionsService,
  ) {
    super();
  }

  async create(body: CreateUserBody): Promise<UserResponse> {
    assertPasswordPolicy(body.password);
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
      emailVerified: true,
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

  async createAccount(body: CreateAccountBody): Promise<CreateAccountResult> {
    assertPasswordPolicy(body.password);
    const email = body.email.trim().toLowerCase();
    const existing = await this.userModel.findOne({ email, ...activeDocumentFilter }).exec();
    if (existing) {
      if (!isEmailVerified(existing) && !existing.organizationId?.trim()) {
        const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);
        existing.passwordHash = passwordHash;
        if (body.name) existing.name = body.name;
        const emailVerificationCode = await this.storeEmailVerificationOtp(existing);
        return {
          user: toAccountUserResponse(existing),
          emailVerificationCode,
        };
      }
      throw new ConflictException("User with this email already exists");
    }
    const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);
    const doc = await this.userModel.create({
      email,
      passwordHash,
      name: body.name,
      status: "active",
      emailVerified: false,
    });
    const emailVerificationCode = await this.storeEmailVerificationOtp(doc);
    return {
      user: toAccountUserResponse(doc),
      emailVerificationCode,
    };
  }

  async verifyEmail(email: string, code: string): Promise<AccountUserResponse> {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = code.trim();
    if (!normalizedEmail || !normalizedCode) {
      throw new BadRequestException("Email et code sont requis");
    }

    const doc = await this.userModel
      .findOne({ email: normalizedEmail, ...activeDocumentFilter })
      .exec();
    if (!doc) {
      throw new UnauthorizedException("Code de vérification invalide ou expiré");
    }
    if (isEmailVerified(doc)) {
      return toAccountUserResponse(doc);
    }
    if (!doc.emailVerificationCodeHash || !doc.emailVerificationExpiresAt) {
      throw new UnauthorizedException("Code de vérification invalide ou expiré");
    }
    if (doc.emailVerificationExpiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException("Code de vérification invalide ou expiré");
    }
    const ok = await bcrypt.compare(normalizedCode, doc.emailVerificationCodeHash);
    if (!ok) {
      throw new UnauthorizedException("Code de vérification invalide ou expiré");
    }

    doc.emailVerified = true;
    doc.emailVerificationCodeHash = undefined;
    doc.emailVerificationExpiresAt = null;
    doc.emailVerificationSentAt = null;
    await doc.save();
    return toAccountUserResponse(doc);
  }

  async resendEmailVerification(email: string): Promise<IssueEmailVerificationResult> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new BadRequestException("Email requis");
    }

    const doc = await this.userModel
      .findOne({ email: normalizedEmail, ...activeDocumentFilter })
      .exec();
    if (!doc || isEmailVerified(doc)) {
      throw new NotFoundException("Aucun compte en attente de vérification pour cet email");
    }
    if (doc.emailVerificationSentAt) {
      const elapsed = Date.now() - doc.emailVerificationSentAt.getTime();
      if (elapsed < EMAIL_OTP_RESEND_COOLDOWN_MS) {
        throw new BadRequestException(
          "Veuillez patienter avant de demander un nouveau code de vérification",
        );
      }
    }

    const emailVerificationCode = await this.storeEmailVerificationOtp(doc);
    return { email: doc.email, emailVerificationCode };
  }

  async findAccountById(id: string): Promise<AccountUserResponse | null> {
    const doc = await this.userModel.findOne({ _id: id, ...activeDocumentFilter }).exec();
    if (!doc) return null;
    return toAccountUserResponse(doc);
  }

  async invite(body: CreateInvitedUserBody): Promise<UserResponse> {
    const email = body.email.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      throw new BadRequestException("Adresse e-mail invalide");
    }
    const invitedRole = body.role ?? DEFAULT_ROLE;

    const existing = await this.userModel.findOne({ email, ...activeDocumentFilter }).exec();
    if (existing) {
      const uid = existing._id.toString();
      const existingMembership = await this.membershipModel
        .findOne({
          userId: uid,
          organizationId: body.organizationId,
          deletedAt: null,
        })
        .exec();

      if (existingMembership?.membershipStatus === "active") {
        throw new ConflictException("Cet utilisateur est déjà membre de l'organisation");
      }
      if (existingMembership?.membershipStatus === "invited") {
        throw new ConflictException("Une invitation est déjà en attente pour cet email");
      }
      if (existingMembership?.membershipStatus === "disabled") {
        throw new ConflictException(
          "Cet utilisateur est désactivé dans l'organisation ; réactivez-le depuis la liste des utilisateurs",
        );
      }

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

      return this.toResponseForOrganization(existing, body.organizationId);
    }

    const doc = await this.userModel.create({
      organizationId: body.organizationId,
      email,
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
    const organizationId = body.organizationId?.trim();
    if (!organizationId) {
      throw new BadRequestException("organizationId is required");
    }

    const doc = await this.userModel.findOne({ _id: id, ...activeDocumentFilter }).exec();
    if (!doc) throw new NotFoundException("User not found");

    const uid = doc._id.toString();
    await this.ensureMembershipsBackfill(doc);

    const pending = await this.membershipModel
      .findOne({
        userId: uid,
        organizationId,
        membershipStatus: "invited",
        deletedAt: null,
      })
      .exec();
    if (!pending) {
      throw new BadRequestException(
        "Aucune invitation en attente pour cette organisation (statut géré via organization_memberships).",
      );
    }

    if (doc.passwordHash) {
      const trustedSession = body.trustedAuthenticatedUserId?.trim() === id;
      if (!trustedSession) {
        if (!body.password?.trim()) {
          throw new BadRequestException("Mot de passe requis pour rejoindre l'organisation");
        }
        const ok = await bcrypt.compare(body.password, doc.passwordHash);
        if (!ok) {
          throw new UnauthorizedException("Mot de passe incorrect");
        }
      }
    } else {
      if (!body.password?.trim()) {
        throw new BadRequestException("Mot de passe requis pour activer le compte");
      }
      assertPasswordPolicy(body.password);
      doc.passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);
    }

    if (body.name) doc.name = body.name;
    doc.status = "active";
    doc.emailVerified = true;
    doc.emailVerificationCodeHash = undefined;
    doc.emailVerificationExpiresAt = null;
    doc.emailVerificationSentAt = null;
    doc.organizationId = organizationId;
    await doc.save();

    await this.membershipModel.updateMany(
      { userId: uid, organizationId, deletedAt: null },
      { $set: { membershipStatus: "active" } },
    );

    return this.toResponseForOrganization(doc, organizationId);
  }

  async getInvitationActivationHints(userId: string): Promise<InvitationActivationHintsResponse> {
    const doc = await this.userModel.findOne({ _id: userId, ...activeDocumentFilter }).exec();
    if (!doc) throw new NotFoundException("User not found");
    return {
      hasPassword: Boolean(doc.passwordHash),
      email: doc.email,
    };
  }

  async updateInvitedUserEmail(
    userId: string,
    organizationId: string,
    email: string,
  ): Promise<UserResponse> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      throw new BadRequestException("Adresse e-mail invalide");
    }

    const doc = await this.userModel.findOne({ _id: userId, ...activeDocumentFilter }).exec();
    if (!doc) throw new NotFoundException("User not found");

    const membership = await this.membershipModel
      .findOne({
        userId,
        organizationId,
        membershipStatus: "invited",
        deletedAt: null,
      })
      .exec();
    if (!membership) {
      throw new BadRequestException("Aucune invitation en attente pour cet utilisateur");
    }

    if (doc.email === normalizedEmail) {
      return this.toResponseForOrganization(doc, organizationId);
    }

    const existing = await this.userModel
      .findOne({ email: normalizedEmail, ...activeDocumentFilter })
      .exec();
    if (existing && existing._id.toString() !== userId) {
      throw new ConflictException("Un utilisateur avec cet email existe déjà");
    }

    doc.email = normalizedEmail;
    await doc.save();
    return this.toResponseForOrganization(doc, organizationId);
  }

  async cancelOrganizationInvitation(userId: string, organizationId: string): Promise<void> {
    const doc = await this.userModel.findOne({ _id: userId, ...activeDocumentFilter }).exec();
    if (!doc) throw new NotFoundException("User not found");

    const membership = await this.membershipModel
      .findOne({
        userId,
        organizationId,
        membershipStatus: "invited",
        deletedAt: null,
      })
      .exec();
    if (!membership) {
      throw new BadRequestException("Aucune invitation en attente pour cet utilisateur");
    }

    const now = new Date();
    membership.deletedAt = now;
    await membership.save();

    const remaining = await this.membershipModel.countDocuments({ userId, deletedAt: null }).exec();
    if (remaining === 0) {
      doc.deletedAt = now;
      if (doc.organizationId === organizationId) {
        doc.organizationId = undefined;
      }
      await doc.save();
    } else if (doc.organizationId === organizationId) {
      const next = await this.membershipModel
        .findOne({ userId, deletedAt: null })
        .sort({ updatedAt: -1 })
        .exec();
      doc.organizationId = next?.organizationId;
      await doc.save();
    }
  }

  async deactivateOrganizationMembership(
    userId: string,
    organizationId: string,
  ): Promise<UserResponse> {
    const doc = await this.userModel.findOne({ _id: userId, ...activeDocumentFilter }).exec();
    if (!doc) throw new NotFoundException("User not found");

    const membership = await this.membershipModel
      .findOne({
        userId,
        organizationId,
        membershipStatus: "active",
        deletedAt: null,
      })
      .exec();
    if (!membership) {
      throw new BadRequestException("Aucun rattachement actif à désactiver pour cet utilisateur");
    }

    if (membership.role === "admin") {
      const otherActiveAdmins = await this.membershipModel
        .countDocuments({
          organizationId,
          membershipStatus: "active",
          role: "admin",
          deletedAt: null,
          userId: { $ne: userId },
        })
        .exec();
      if (otherActiveAdmins === 0) {
        throw new BadRequestException(
          "Impossible de désactiver le dernier administrateur de l'organisation",
        );
      }
    }

    membership.membershipStatus = "disabled";
    await membership.save();

    await this.sessionsService.revokeSession(userId);
    if (doc.organizationId === organizationId) {
      const nextActive = await this.membershipModel
        .findOne({
          userId,
          membershipStatus: "active",
          deletedAt: null,
        })
        .sort({ updatedAt: -1 })
        .exec();
      doc.organizationId = nextActive?.organizationId ?? organizationId;
    }
    await doc.save();

    return this.toResponseForOrganization(doc, organizationId);
  }

  async reactivateOrganizationMembership(
    userId: string,
    organizationId: string,
  ): Promise<UserResponse> {
    const doc = await this.userModel.findOne({ _id: userId, ...activeDocumentFilter }).exec();
    if (!doc) throw new NotFoundException("User not found");

    const membership = await this.membershipModel
      .findOne({
        userId,
        organizationId,
        membershipStatus: "disabled",
        deletedAt: null,
      })
      .exec();
    if (!membership) {
      throw new BadRequestException(
        "Aucun rattachement désactivé à réactiver pour cet utilisateur",
      );
    }

    membership.membershipStatus = "active";
    await membership.save();

    if (!doc.organizationId?.trim()) {
      doc.organizationId = organizationId;
      await doc.save();
    }

    return this.toResponseForOrganization(doc, organizationId);
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

  async findById(id: string, organizationId?: string): Promise<UserResponse | null> {
    const doc = await this.userModel.findOne({ _id: id, ...activeDocumentFilter }).exec();
    if (!doc) return null;
    await this.ensureMembershipsBackfill(doc);
    const scopedOrgId = organizationId?.trim() || doc.organizationId?.trim();
    if (!scopedOrgId) return null;
    try {
      return await this.toResponseForOrganization(doc, scopedOrgId);
    } catch (err) {
      if (organizationId?.trim() && err instanceof NotFoundException) return null;
      throw err;
    }
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
        ...toUserBaseResponse(u),
        organizationId,
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
    return rows.map((r) => toOrganizationMembershipResponse(r));
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
    return toOrganizationMembershipResponse(doc);
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
    assertPasswordPolicy(body.newPassword);
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
    await this.sessionsService.revokeSession(id);
  }

  async findFoundingAdminUserId(organizationId: string): Promise<string | null> {
    const orgId = organizationId?.trim();
    if (!orgId) return null;
    const doc = await this.membershipModel
      .findOne({
        organizationId: orgId,
        role: "admin",
        deletedAt: null,
        membershipStatus: { $in: ["active", "invited"] },
      })
      .sort({ createdAt: 1 })
      .exec();
    return doc?.userId ?? null;
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

    const emailVerified = isEmailVerified(doc);
    if (!emailVerified) {
      return {
        id: doc._id.toString(),
        email: doc.email,
        name: doc.name,
        status: doc.status,
        emailVerified: false,
      };
    }

    await this.ensureMembershipsBackfill(doc);

    const uid = doc._id.toString();
    if (!doc.organizationId?.trim()) {
      doc.lastLoginAt = new Date();
      await doc.save();
      return {
        id: uid,
        email: doc.email,
        name: doc.name,
        status: doc.status,
        emailVerified: true,
      };
    }

    const memberships = await this.membershipModel.find({ userId: uid, deletedAt: null }).exec();
    const activeMembership =
      memberships.find(
        (m) => m.organizationId === doc.organizationId && m.membershipStatus === "active",
      ) ?? memberships.find((m) => m.membershipStatus === "active");

    if (activeMembership) {
      if (doc.organizationId !== activeMembership.organizationId) {
        doc.organizationId = activeMembership.organizationId;
      }
      doc.lastLoginAt = new Date();
      await doc.save();
      return {
        id: uid,
        organizationId: activeMembership.organizationId,
        email: doc.email,
        name: doc.name,
        role: activeMembership.role as ValidateCredentialsResponse["role"],
        status: doc.status,
        emailVerified: true,
      };
    }

    const hasDisabledOnly =
      memberships.length > 0 &&
      memberships.every(
        (m) => m.membershipStatus === "disabled" || m.membershipStatus === "invited",
      ) &&
      memberships.some((m) => m.membershipStatus === "disabled");

    if (hasDisabledOnly) {
      throw new ForbiddenException(
        "Votre accès à l'organisation a été désactivé. Contactez un administrateur pour être réactivé.",
      );
    }

    return null;
  }

  async listPlatformDirectory(filters?: {
    search?: string;
    organizationId?: string;
    activeOnly?: boolean;
    includeTestAccounts?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<PlatformUsersDirectoryResult> {
    const limit = Math.min(Math.max(filters?.limit ?? 50, 1), 200);
    const offset = Math.max(filters?.offset ?? 0, 0);
    const query: Record<string, unknown> = { ...activeDocumentFilter };

    if (filters?.organizationId?.trim()) {
      query.organizationId = filters.organizationId.trim();
    }

    if (!filters?.includeTestAccounts) {
      query.email = { $not: platformMetricsExcludedEmailDomainRegex() };
    }

    const search = filters?.search?.trim();
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { email: { $regex: escaped, $options: "i" } },
        { name: { $regex: escaped, $options: "i" } },
      ];
    }

    if (filters?.activeOnly) {
      return this.listPlatformDirectoryActiveOnly(query, limit, offset);
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

    const users = await this.toPlatformUserSummaries(docs);
    const lastSeenByUser = await this.sessionsService.getLatestLastSeenByUserIds(
      users.map((u) => u.id),
    );
    for (const user of users) {
      const lastSeenAt = lastSeenByUser[user.id];
      if (lastSeenAt) user.lastSeenAt = lastSeenAt;
    }

    return { users, total };
  }

  private async listPlatformDirectoryActiveOnly(
    query: Record<string, unknown>,
    limit: number,
    offset: number,
  ): Promise<PlatformUsersDirectoryResult> {
    const since = new Date(Date.now() - PLATFORM_USER_ACTIVE_WITHIN_MS);
    const hasUserFilter = Boolean(query.organizationId || query.$or || query.email);

    let candidateIds: string[] | undefined;
    if (hasUserFilter) {
      const candidates = await this.userModel
        .find(query)
        .select("_id")
        .limit(PLATFORM_ACTIVE_CANDIDATE_CAP)
        .exec();
      candidateIds = candidates.map((d) => d._id.toString());
      if (candidateIds.length === 0) {
        return { users: [], total: 0 };
      }
    }

    const { userIds, total } = await this.sessionsService.listUserIdsActiveSince(since, {
      limit,
      offset,
      userIds: candidateIds,
    });
    if (userIds.length === 0) {
      return { users: [], total };
    }

    const docs = await this.userModel
      .find({ _id: { $in: userIds }, ...activeDocumentFilter })
      .exec();
    const byId = new Map(docs.map((d) => [d._id.toString(), d]));
    const ordered = userIds.map((id) => byId.get(id)).filter(Boolean) as UserDocument[];
    const users = await this.toPlatformUserSummaries(ordered);
    const lastSeenByUser = await this.sessionsService.getLatestLastSeenByUserIds(
      users.map((u) => u.id),
    );
    for (const user of users) {
      const lastSeenAt = lastSeenByUser[user.id];
      if (lastSeenAt) user.lastSeenAt = lastSeenAt;
    }
    return { users, total };
  }

  async getPlatformDashboardStats(): Promise<{
    userCount: number;
    connectedUserCount: number;
    recentLogins: Array<{
      userId: string;
      email: string;
      name?: string;
      organizationId?: string;
      lastLoginAt: string;
    }>;
  }> {
    const excludedEmailRe = platformMetricsExcludedEmailDomainRegex();
    const metricsUserFilter = {
      ...activeDocumentFilter,
      email: { $not: excludedEmailRe },
    };
    const userCount = await this.userModel.countDocuments(metricsUserFilter).exec();

    const since = new Date(Date.now() - PLATFORM_USER_ACTIVE_WITHIN_MS);
    const activeIds = await this.sessionsService.listAllDistinctUserIdsActiveSince(since);
    const connectedUserCount =
      activeIds.length === 0
        ? 0
        : await this.userModel
            .countDocuments({
              ...metricsUserFilter,
              _id: { $in: activeIds },
            })
            .exec();

    const recentLoginDocs = await this.userModel
      .find({
        ...metricsUserFilter,
        lastLoginAt: { $exists: true, $ne: null },
      })
      .sort({ lastLoginAt: -1 })
      .limit(10)
      .select({ email: 1, name: 1, organizationId: 1, lastLoginAt: 1 })
      .lean()
      .exec();

    const recentLogins = recentLoginDocs
      .filter((doc) => doc.lastLoginAt)
      .map((doc) => ({
        userId: String(doc._id),
        email: String(doc.email ?? ""),
        name: typeof doc.name === "string" && doc.name.trim() ? doc.name.trim() : undefined,
        organizationId:
          typeof doc.organizationId === "string" && doc.organizationId.trim()
            ? doc.organizationId.trim()
            : undefined,
        lastLoginAt: new Date(doc.lastLoginAt as Date).toISOString(),
      }));

    return { userCount, connectedUserCount, recentLogins };
  }

  async listOrganizationIdsWithExcludedEmails(): Promise<string[]> {
    const excludedEmailRe = platformMetricsExcludedEmailDomainRegex();
    const users = await this.userModel
      .find({ ...activeDocumentFilter, email: excludedEmailRe })
      .select({ organizationId: 1 })
      .lean()
      .exec();
    const orgIds = new Set<string>();
    const userIds: string[] = [];
    for (const user of users) {
      userIds.push(String(user._id));
      const orgId = typeof user.organizationId === "string" ? user.organizationId.trim() : "";
      if (orgId) orgIds.add(orgId);
    }
    if (userIds.length > 0) {
      const memberships = await this.membershipModel
        .find({ userId: { $in: userIds }, deletedAt: null })
        .select({ organizationId: 1 })
        .lean()
        .exec();
      for (const membership of memberships) {
        const orgId =
          typeof membership.organizationId === "string" ? membership.organizationId.trim() : "";
        if (orgId) orgIds.add(orgId);
      }
    }
    return [...orgIds];
  }

  private async toPlatformUserSummaries(docs: UserDocument[]): Promise<PlatformUserSummary[]> {
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
    return users;
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

  private async storeEmailVerificationOtp(doc: UserDocument): Promise<string> {
    const code = String(randomInt(100_000, 1_000_000));
    doc.emailVerificationCodeHash = await bcrypt.hash(code, SALT_ROUNDS);
    doc.emailVerificationExpiresAt = new Date(Date.now() + EMAIL_OTP_TTL_MS);
    doc.emailVerificationSentAt = new Date();
    doc.emailVerified = false;
    await doc.save();
    return code;
  }

  private async toResponseForOrganization(
    doc: UserDocument,
    organizationId: string,
  ): Promise<UserResponse> {
    const membership = await this.membershipModel
      .findOne({ userId: doc._id.toString(), organizationId, deletedAt: null })
      .exec();
    if (!membership) {
      throw new NotFoundException(
        "Aucun rattachement organisation pour cet utilisateur (organization_memberships).",
      );
    }
    return {
      ...toUserBaseResponse(doc),
      organizationId,
      role: membership.role as UserResponse["role"],
      organizationMembershipStatus:
        membership.membershipStatus as UserResponse["organizationMembershipStatus"],
    };
  }
}
