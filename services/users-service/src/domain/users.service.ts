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
import { randomInt, randomUUID } from "crypto";
import * as bcrypt from "bcrypt";
import type { UserDocument } from "../persistence/user.schema";
import type { OrganizationMembershipDocument } from "../persistence/organization-membership.schema";
import type { UserPreferencesDocument } from "../persistence/user-preferences.schema";
import type { SupportImpersonationAuditDocument } from "../persistence/support-impersonation-audit.schema";
import type { UserSessionDocument } from "../persistence/user-session.schema";
import {
  activeDocumentFilter,
  DEFAULT_USER_PREFERENCES,
  getPasswordPolicyError,
  normalizeQuickActionIds,
  type ActivateInvitedUserBody,
  type ChangePasswordBody,
  type CreateAccountBody,
  type CreateAccountResult,
  type CreateInvitedUserBody,
  type CreateOrganizationMembershipBody,
  type CreateUserBody,
  type CreateUserSessionResponse,
  type InvitationActivationHintsResponse,
  type IssueEmailVerificationResult,
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
  type UserSessionResponse,
  type ValidateCredentialsResponse,
  type ValidateUserSessionResponse,
} from "@planwise/shared";
import {
  AbstractUsersService,
  type CreateImpersonationAuditBody,
  type PlatformUsersDirectoryResult,
} from "./ports/users.service.port";
import { deriveSessionDeviceClass, deriveSessionLabel } from "./session-label";

/** bcrypt cost factor (OWASP recommande ≥ 10 ; 12 est un bon compromis). */
const SALT_ROUNDS = 12;
const DEFAULT_ROLE: UserRole = "member";
const EMAIL_OTP_TTL_MS = 15 * 60 * 1000;
const EMAIL_OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const SESSION_LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000;
const MAX_USER_AGENT_LENGTH = 400;

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
    @InjectModel("UserPreferences")
    private readonly preferencesModel: Model<UserPreferencesDocument>,
    @InjectModel("SupportImpersonationAudit")
    private readonly impersonationAuditModel: Model<SupportImpersonationAuditDocument>,
    @InjectModel("UserSession")
    private readonly sessionModel: Model<UserSessionDocument>,
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
      if (!this.isEmailVerified(existing) && !existing.organizationId?.trim()) {
        const passwordHash = await bcrypt.hash(body.password, SALT_ROUNDS);
        existing.passwordHash = passwordHash;
        if (body.name) existing.name = body.name;
        const emailVerificationCode = await this.storeEmailVerificationOtp(existing);
        return {
          user: this.toAccountResponse(existing),
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
      user: this.toAccountResponse(doc),
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
    if (this.isEmailVerified(doc)) {
      return this.toAccountResponse(doc);
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
    return this.toAccountResponse(doc);
  }

  async resendEmailVerification(email: string): Promise<IssueEmailVerificationResult> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new BadRequestException("Email requis");
    }

    const doc = await this.userModel
      .findOne({ email: normalizedEmail, ...activeDocumentFilter })
      .exec();
    if (!doc || this.isEmailVerified(doc)) {
      // Réponse neutre côté gateway : ne pas révéler si l'email existe.
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
    return this.toAccountResponse(doc);
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
    // Org « courante » après acceptation (le membership org1 reste actif s’il l’était).
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

    await this.revokeSession(userId);
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
      // Multi-org : l’utilisateur existe mais n’a pas de membership dans l’org demandée.
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
        ...this.toBaseResponse(u),
        // Toujours l’org du membership listé (pas l’org « primaire » du document user).
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
    await this.revokeSession(id);
  }

  async getPreferences(userId: string, organizationId?: string): Promise<UserPreferencesResponse> {
    const doc = await this.preferencesModel.findOne({ userId }).exec();
    if (!doc) {
      return {
        userId,
        preferences: this.withOrgScopedPreferences({ ...DEFAULT_USER_PREFERENCES }, organizationId),
      };
    }
    return {
      userId: doc.userId,
      preferences: this.withOrgScopedPreferences(this.toPreferences(doc), organizationId),
    };
  }

  async updatePreferences(
    userId: string,
    body: UpdateUserPreferencesBody,
  ): Promise<UserPreferencesResponse> {
    const user = await this.userModel.findOne({ _id: userId, ...activeDocumentFilter }).exec();
    if (!user) throw new NotFoundException("User not found");

    const orgId = body.organizationId?.trim();
    if (body.onboardingProfileCompleted !== undefined && !orgId) {
      throw new BadRequestException(
        "organizationId is required when updating onboardingProfileCompleted",
      );
    }
    if (body.setupGuideDismissed !== undefined && !orgId) {
      throw new BadRequestException("organizationId is required when updating setupGuideDismissed");
    }

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

    const $setOnInsert: Record<string, unknown> = {
      userId,
      ...(body.theme === undefined ? { theme: DEFAULT_USER_PREFERENCES.theme } : {}),
      ...(body.sidebarCollapsed === undefined
        ? { sidebarCollapsed: DEFAULT_USER_PREFERENCES.sidebarCollapsed }
        : {}),
      ...(body.quickActionIds === undefined
        ? { quickActionIds: [...DEFAULT_USER_PREFERENCES.quickActionIds] }
        : {}),
    };

    const update: Record<string, unknown> = {
      $setOnInsert,
    };
    if (Object.keys($set).length > 0) {
      update.$set = $set;
    }

    const $addToSet: Record<string, string> = {};
    const $pull: Record<string, string> = {};

    if (body.onboardingProfileCompleted === true && orgId) {
      $addToSet.onboardingCompletedOrganizationIds = orgId;
    } else if (body.onboardingProfileCompleted === false && orgId) {
      $pull.onboardingCompletedOrganizationIds = orgId;
    }

    if (body.setupGuideDismissed === true && orgId) {
      $addToSet.setupGuideDismissedOrganizationIds = orgId;
    } else if (body.setupGuideDismissed === false && orgId) {
      $pull.setupGuideDismissedOrganizationIds = orgId;
    }

    if (Object.keys($addToSet).length > 0) {
      update.$addToSet = $addToSet;
    }
    if (Object.keys($pull).length > 0) {
      update.$pull = $pull;
    }

    // Initialiser les listes à l’insert seulement si on ne les touche pas (évite conflit Mongo).
    if (
      !$addToSet.onboardingCompletedOrganizationIds &&
      !$pull.onboardingCompletedOrganizationIds
    ) {
      $setOnInsert.onboardingCompletedOrganizationIds = [];
    }
    if (
      !$addToSet.setupGuideDismissedOrganizationIds &&
      !$pull.setupGuideDismissedOrganizationIds
    ) {
      $setOnInsert.setupGuideDismissedOrganizationIds = [];
    }

    const doc = await this.preferencesModel
      .findOneAndUpdate({ userId }, update, { upsert: true, new: true })
      .exec();

    return {
      userId: doc!.userId,
      preferences: this.withOrgScopedPreferences(this.toPreferences(doc!), orgId),
    };
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

  private toPreferences(doc: UserPreferencesDocument): UserPreferences {
    const quickActionIds = normalizeQuickActionIds(doc.quickActionIds) ?? [
      ...DEFAULT_USER_PREFERENCES.quickActionIds,
    ];
    const onboardingOrgIds = Array.isArray(doc.onboardingCompletedOrganizationIds)
      ? [...new Set(doc.onboardingCompletedOrganizationIds.filter(Boolean))]
      : [];
    const setupGuideOrgIds = Array.isArray(doc.setupGuideDismissedOrganizationIds)
      ? [...new Set(doc.setupGuideDismissedOrganizationIds.filter(Boolean))]
      : [];
    return {
      theme: doc.theme,
      sidebarCollapsed: doc.sidebarCollapsed,
      quickActionIds,
      onboardingCompletedOrganizationIds: onboardingOrgIds,
      onboardingProfileCompleted: false,
      setupGuideDismissedOrganizationIds: setupGuideOrgIds,
      setupGuideDismissed: false,
    };
  }

  private withOrgScopedPreferences(
    preferences: UserPreferences,
    organizationId?: string,
  ): UserPreferences {
    const orgId = organizationId?.trim();
    if (!orgId) {
      return {
        ...preferences,
        onboardingProfileCompleted: preferences.onboardingCompletedOrganizationIds.length > 0,
        setupGuideDismissed: preferences.setupGuideDismissedOrganizationIds.length > 0,
      };
    }
    return {
      ...preferences,
      onboardingProfileCompleted: preferences.onboardingCompletedOrganizationIds.includes(orgId),
      setupGuideDismissed: preferences.setupGuideDismissedOrganizationIds.includes(orgId),
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

    const emailVerified = this.isEmailVerified(doc);
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

  async createSession(
    userId: string,
    options?: { userAgent?: string },
  ): Promise<CreateUserSessionResponse> {
    const doc = await this.userModel.findOne({ _id: userId, ...activeDocumentFilter }).exec();
    if (!doc) throw new NotFoundException("User not found");

    const now = new Date();
    const sessionId = randomUUID();
    const rawUa = options?.userAgent?.trim() ?? "";
    const userAgent = rawUa ? rawUa.slice(0, MAX_USER_AGENT_LENGTH) : undefined;
    const deviceClass = deriveSessionDeviceClass(userAgent);

    // 1 session max par classe (bureau / mobile) : remplace l'éventuelle session du même type.
    await this.sessionModel.deleteMany({ userId, deviceClass }).exec();

    // Migration soft : sessions legacy sans deviceClass → reclassées via userAgent.
    const legacy = await this.sessionModel
      .find({ userId, deviceClass: { $exists: false } })
      .select("_id userAgent")
      .exec();
    const legacyIds = legacy
      .filter((s) => deriveSessionDeviceClass(s.userAgent) === deviceClass)
      .map((s) => s._id);
    if (legacyIds.length > 0) {
      await this.sessionModel.deleteMany({ _id: { $in: legacyIds } }).exec();
    }

    await this.sessionModel.create({
      userId,
      sessionId,
      deviceClass,
      label: deriveSessionLabel(userAgent),
      userAgent,
      createdAt: now,
      lastSeenAt: now,
    });

    // Nettoyage legacy (session unique sur le document user).
    await this.userModel
      .updateOne({ _id: userId }, { $unset: { activeSessionId: "" } })
      .exec()
      .catch(() => undefined);

    return { sessionId };
  }

  async validateSession(userId: string, sessionId: string): Promise<ValidateUserSessionResponse> {
    if (!sessionId?.trim()) {
      return { valid: false };
    }
    const session = await this.sessionModel.findOne({ userId, sessionId: sessionId.trim() }).exec();
    if (!session) return { valid: false };

    const now = Date.now();
    if (now - session.lastSeenAt.getTime() >= SESSION_LAST_SEEN_THROTTLE_MS) {
      session.lastSeenAt = new Date(now);
      await session.save().catch(() => undefined);
    }
    return { valid: true };
  }

  async revokeSession(userId: string, sessionId?: string): Promise<void> {
    const user = await this.userModel.findOne({ _id: userId, ...activeDocumentFilter }).exec();
    if (!user) throw new NotFoundException("User not found");

    if (sessionId?.trim()) {
      await this.sessionModel.deleteOne({ userId, sessionId: sessionId.trim() }).exec();
      return;
    }
    await this.sessionModel.deleteMany({ userId }).exec();
    await this.userModel
      .updateOne({ _id: userId }, { $unset: { activeSessionId: "" } })
      .exec()
      .catch(() => undefined);
  }

  async revokeOtherSessions(userId: string, keepSessionId: string): Promise<void> {
    const user = await this.userModel.findOne({ _id: userId, ...activeDocumentFilter }).exec();
    if (!user) throw new NotFoundException("User not found");
    const keep = keepSessionId.trim();
    if (!keep) {
      throw new BadRequestException("sessionId courant requis");
    }
    await this.sessionModel.deleteMany({ userId, sessionId: { $ne: keep } }).exec();
  }

  async listSessions(userId: string, currentSessionId?: string): Promise<UserSessionResponse[]> {
    const user = await this.userModel.findOne({ _id: userId, ...activeDocumentFilter }).exec();
    if (!user) throw new NotFoundException("User not found");

    const docs = await this.sessionModel.find({ userId }).sort({ lastSeenAt: -1 }).exec();
    const current = currentSessionId?.trim() ?? "";
    return docs.map((doc) => ({
      id: doc._id.toString(),
      sessionId: doc.sessionId,
      label: doc.label,
      deviceClass: doc.deviceClass ?? deriveSessionDeviceClass(doc.userAgent),
      userAgent: doc.userAgent,
      createdAt: doc.createdAt.toISOString(),
      lastSeenAt: doc.lastSeenAt.toISOString(),
      current: current.length > 0 && doc.sessionId === current,
    }));
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

  private async storeEmailVerificationOtp(doc: UserDocument): Promise<string> {
    const code = String(randomInt(100_000, 1_000_000));
    doc.emailVerificationCodeHash = await bcrypt.hash(code, SALT_ROUNDS);
    doc.emailVerificationExpiresAt = new Date(Date.now() + EMAIL_OTP_TTL_MS);
    doc.emailVerificationSentAt = new Date();
    doc.emailVerified = false;
    await doc.save();
    return code;
  }

  /** Legacy / invitations : champ absent ⇒ considéré vérifié. */
  private isEmailVerified(doc: UserDocument): boolean {
    return doc.emailVerified !== false;
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
      ...this.toBaseResponse(doc),
      organizationId,
      role: membership.role as UserResponse["role"],
      organizationMembershipStatus:
        membership.membershipStatus as UserResponse["organizationMembershipStatus"],
    };
  }

  private toAccountResponse(doc: UserDocument): AccountUserResponse {
    return {
      id: doc._id.toString(),
      email: doc.email,
      name: doc.name,
      status: doc.status,
      emailVerified: this.isEmailVerified(doc),
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
