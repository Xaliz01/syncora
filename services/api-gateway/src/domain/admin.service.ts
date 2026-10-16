import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type {
  AssignUserPermissionsBody,
  AuthUser,
  CancelInvitationResponse,
  CreateInvitationBody,
  CreateInvitedUserBody,
  CreatePermissionProfileBody,
  InvitationResponse,
  ResendInvitationResponse,
  UpdatePendingInvitationBody,
  UpdatePendingInvitationResponse,
  UpdatePermissionProfileBody,
  UserResponse,
} from "@planwise/shared";
import {
  ASSIGNABLE_PERMISSION_CODES,
  BASE_SUBSCRIPTION_PLAN,
  membershipCountsTowardUserSeat,
} from "@planwise/shared";
import {
  assertAnyAssignablePermission,
  assertAssignablePermission,
} from "../infrastructure/permission-checks";
import {
  AbstractAdminService,
  type InviteOrganizationUserBody,
  type UpdateUserPermissionsBody,
  type CreatePermissionProfileForOrgBody,
  type UpdatePermissionProfileForOrgBody,
} from "./ports/admin.service.port";
import { AbstractUsersService } from "./users/ports/users.service.port";
import { AbstractPermissionsService } from "./permissions/ports/permissions.service.port";
import { AbstractEmailService } from "./notifications/ports/email.service.port";
import { SubscriptionsService } from "./subscriptions/subscriptions.service";

@Injectable()
export class AdminService extends AbstractAdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly users: AbstractUsersService,
    private readonly permissions: AbstractPermissionsService,
    private readonly email: AbstractEmailService,
    private readonly subscriptions: SubscriptionsService,
  ) {
    super();
  }

  getPermissionsCatalog() {
    return {
      /** Droits configurables (profils, invitations) — hors indicateurs système comme `subscription.active`. */
      availablePermissions: [...ASSIGNABLE_PERMISSION_CODES],
    };
  }

  async inviteUser(currentUser: AuthUser, body: InviteOrganizationUserBody) {
    await this.assertOrganizationUserSeatAvailable(currentUser.organizationId);

    const invitedRole = body.role ?? "member";
    if (
      invitedRole === "admin" &&
      (body.profileId ||
        (body.extraPermissions?.length ?? 0) > 0 ||
        (body.revokedPermissions?.length ?? 0) > 0)
    ) {
      throw new BadRequestException(
        "Les administrateurs d'organisation ont tous les droits ; les profils et permissions personnalisées ne sont pas autorisés",
      );
    }

    const createInvitedUserBody: CreateInvitedUserBody = {
      organizationId: currentUser.organizationId,
      email: body.email,
      name: body.name,
      role: invitedRole,
      invitedByUserId: currentUser.id,
    };
    const invitedUser = await this.users.invite(createInvitedUserBody);

    const assignment =
      invitedUser.role === "admin"
        ? {
            organizationId: currentUser.organizationId,
            userId: invitedUser.id,
            extraPermissions: [],
            revokedPermissions: [],
            effectivePermissions: [...ASSIGNABLE_PERMISSION_CODES],
          }
        : await this.permissions.assignUserPermissions({
            organizationId: currentUser.organizationId,
            userId: invitedUser.id,
            profileId: body.profileId ?? null,
            extraPermissions: body.extraPermissions ?? [],
            revokedPermissions: body.revokedPermissions ?? [],
          } satisfies AssignUserPermissionsBody);

    const invitation = await this.permissions.createInvitation({
      organizationId: currentUser.organizationId,
      invitedUserId: invitedUser.id,
      invitedEmail: invitedUser.email,
      invitedName: invitedUser.name,
      invitedByUserId: currentUser.id,
      profileId: invitedUser.role === "admin" ? undefined : body.profileId,
      extraPermissions: invitedUser.role === "admin" ? [] : (body.extraPermissions ?? []),
      revokedPermissions: invitedUser.role === "admin" ? [] : (body.revokedPermissions ?? []),
    } satisfies CreateInvitationBody);

    const emailSent = await this.sendInvitationEmail(
      invitation,
      currentUser.name ?? currentUser.email,
    );

    return {
      invitedUser,
      assignment,
      invitation,
      emailSent,
    };
  }

  async resendInvitation(
    currentUser: AuthUser,
    invitationId: string,
  ): Promise<ResendInvitationResponse> {
    const invitation = await this.permissions.findInvitationById(
      invitationId,
      currentUser.organizationId,
    );

    if (invitation.status !== "pending") {
      throw new BadRequestException("Seules les invitations en attente peuvent être renvoyées");
    }

    const emailSent = await this.sendInvitationEmail(
      invitation,
      currentUser.name ?? currentUser.email,
    );
    return { ok: true, invitation, emailSent };
  }

  async updatePendingInvitation(
    currentUser: AuthUser,
    invitationId: string,
    body: UpdatePendingInvitationBody,
  ): Promise<UpdatePendingInvitationResponse> {
    const invitation = await this.permissions.findInvitationById(
      invitationId,
      currentUser.organizationId,
    );

    if (invitation.status !== "pending") {
      throw new BadRequestException("Seules les invitations en attente peuvent être modifiées");
    }

    await this.users.updateInvitedUserEmail(
      invitation.invitedUserId,
      currentUser.organizationId,
      body.email,
    );

    const updatedInvitation = await this.permissions.updatePendingInvitationEmail(
      invitationId,
      currentUser.organizationId,
      body.email,
    );

    const emailSent = await this.sendInvitationEmail(
      updatedInvitation,
      currentUser.name ?? currentUser.email,
    );
    return { invitation: updatedInvitation, emailSent };
  }

  async cancelInvitation(
    currentUser: AuthUser,
    invitationId: string,
  ): Promise<CancelInvitationResponse> {
    const invitation = await this.permissions.findInvitationById(
      invitationId,
      currentUser.organizationId,
    );

    if (invitation.status !== "pending") {
      throw new BadRequestException("Seules les invitations en attente peuvent être annulées");
    }

    await this.permissions.cancelInvitation(invitationId, currentUser.organizationId);
    await this.users.cancelOrganizationInvitation(
      invitation.invitedUserId,
      currentUser.organizationId,
    );
    await this.permissions.deleteUserAssignment(
      currentUser.organizationId,
      invitation.invitedUserId,
    );

    return { ok: true };
  }

  async deactivateOrganizationUser(currentUser: AuthUser, userId: string) {
    if (userId === currentUser.id) {
      throw new BadRequestException("Vous ne pouvez pas désactiver votre propre compte");
    }

    const user = await this.users.deactivateOrganizationMembership(
      userId,
      currentUser.organizationId,
    );

    return { user };
  }

  async reactivateOrganizationUser(currentUser: AuthUser, userId: string) {
    await this.assertOrganizationUserSeatAvailable(currentUser.organizationId);

    const user = await this.users.reactivateOrganizationMembership(
      userId,
      currentUser.organizationId,
    );

    return { user };
  }

  async listOrganizationUsers(currentUser: AuthUser) {
    const users = await this.users.listByOrganization(currentUser.organizationId);

    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        const [assignment, effectivePermissions] = await Promise.all([
          this.permissions.getUserAssignment(currentUser.organizationId, user.id),
          this.permissions.resolveEffectivePermissions({
            organizationId: currentUser.organizationId,
            userId: user.id,
            role: user.role,
          }),
        ]);
        return {
          ...user,
          permissions: effectivePermissions.permissions,
          permissionAssignment: assignment,
        };
      }),
    );
    return {
      users: enrichedUsers,
    };
  }

  async getOrganizationUser(currentUser: AuthUser, userId: string) {
    const [user, memberships] = await Promise.all([
      this.users.findById(userId),
      this.users.listOrganizationMemberships(userId),
    ]);
    if (!user) {
      throw new NotFoundException("Utilisateur introuvable");
    }

    const membershipForOrg = memberships.find(
      (row) => row.organizationId === currentUser.organizationId,
    );
    if (!membershipForOrg) {
      throw new ForbiddenException(
        "Impossible d'accéder à un utilisateur d'une autre organisation",
      );
    }

    const [assignment, effectivePermissions] = await Promise.all([
      this.permissions.getUserAssignment(currentUser.organizationId, user.id),
      this.permissions.resolveEffectivePermissions({
        organizationId: currentUser.organizationId,
        userId: user.id,
        role: membershipForOrg.role,
      }),
    ]);

    return {
      user: {
        ...user,
        organizationId: currentUser.organizationId,
        role: membershipForOrg.role,
        organizationMembershipStatus: membershipForOrg.membershipStatus,
        permissions: effectivePermissions.permissions,
        permissionAssignment: assignment,
      },
    };
  }

  async assignUserPermissions(
    currentUser: AuthUser,
    userId: string,
    body: UpdateUserPermissionsBody,
  ) {
    const touchesExtra = (body.extraPermissions?.length ?? 0) > 0;
    const touchesRevoked = (body.revokedPermissions?.length ?? 0) > 0;
    if (touchesExtra || touchesRevoked) {
      assertAssignablePermission(currentUser, "users.manage_permissions");
    } else if (body.profileId !== undefined) {
      assertAnyAssignablePermission(currentUser, [
        "users.assign_profile",
        "users.manage_permissions",
      ]);
    } else {
      assertAssignablePermission(currentUser, "users.manage_permissions");
    }

    const targetUser = await this.requireOrganizationUser(currentUser.organizationId, userId);
    if (targetUser.role === "admin") {
      throw new BadRequestException(
        "Les administrateurs d'organisation ont tous les droits et ne peuvent pas avoir de profils/permissions personnalisés",
      );
    }

    const assignment = await this.permissions.assignUserPermissions({
      organizationId: currentUser.organizationId,
      userId,
      profileId: body.profileId ?? null,
      extraPermissions: body.extraPermissions ?? [],
      revokedPermissions: body.revokedPermissions ?? [],
    } satisfies AssignUserPermissionsBody);

    const effectivePermissions = await this.permissions.resolveEffectivePermissions({
      organizationId: currentUser.organizationId,
      userId,
      role: targetUser.role,
    });

    return {
      userId,
      role: targetUser.role,
      assignment,
      effectivePermissions: effectivePermissions.permissions,
    };
  }

  async createPermissionProfile(currentUser: AuthUser, body: CreatePermissionProfileForOrgBody) {
    return this.permissions.createProfile({
      organizationId: currentUser.organizationId,
      name: body.name,
      description: body.description,
      permissions: body.permissions,
    } satisfies CreatePermissionProfileBody);
  }

  async listPermissionProfiles(currentUser: AuthUser) {
    return this.permissions.listProfiles(currentUser.organizationId);
  }

  async getPermissionProfile(currentUser: AuthUser, profileId: string) {
    return this.permissions.findProfileById(profileId, currentUser.organizationId);
  }

  async updatePermissionProfile(
    currentUser: AuthUser,
    profileId: string,
    body: UpdatePermissionProfileForOrgBody,
  ) {
    return this.permissions.updateProfile(profileId, {
      organizationId: currentUser.organizationId,
      ...body,
    } satisfies UpdatePermissionProfileBody);
  }

  async deletePermissionProfile(currentUser: AuthUser, profileId: string) {
    return this.permissions.deleteProfile(profileId, currentUser.organizationId);
  }

  async listInvitations(currentUser: AuthUser, status?: "pending" | "accepted" | "cancelled") {
    return this.permissions.listInvitations(currentUser.organizationId, status);
  }

  private async requireOrganizationUser(
    organizationId: string,
    userId: string,
  ): Promise<UserResponse> {
    const targetUser = await this.users.findById(userId, organizationId);
    if (!targetUser || targetUser.organizationId !== organizationId) {
      throw new ForbiddenException("Impossible de gérer un utilisateur d'une autre organisation");
    }
    return targetUser;
  }

  private async sendInvitationEmail(
    invitation: InvitationResponse,
    invitedByLabel: string,
  ): Promise<boolean> {
    const acceptPath = `/accept-invitation?token=${encodeURIComponent(invitation.invitationToken)}`;
    const greeting = invitation.invitedName?.trim()
      ? `Bonjour ${invitation.invitedName.trim()},`
      : "Bonjour,";
    const body = `${greeting}\n\n${invitedByLabel} vous invite à rejoindre une organisation sur Planwise.\n\nCliquez sur le bouton ci-dessous pour accepter l'invitation.\n\nSi vous n'attendiez pas cette invitation, vous pouvez ignorer cet e-mail.`;

    try {
      const res = await this.email.sendTransactionalEmail(
        invitation.invitedEmail,
        "Invitation à rejoindre Planwise",
        body,
        acceptPath,
        "Accepter l'invitation",
      );
      if (!res.sent) {
        this.logger.warn(
          `Invitation email not sent to ${invitation.invitedEmail}: ${res.reason ?? "unknown"}`,
        );
        return false;
      }
      return true;
    } catch (err) {
      this.logger.warn(
        `Failed to send invitation email to ${invitation.invitedEmail}`,
        (err as Error).message,
      );
      return false;
    }
  }

  private async assertOrganizationUserSeatAvailable(organizationId: string): Promise<void> {
    const [subscription, users] = await Promise.all([
      this.subscriptions.getByOrganization(organizationId),
      this.users.listByOrganization(organizationId),
    ]);

    if (!subscription.hasAccess) {
      return;
    }

    const seatUsed = users.filter((user) =>
      membershipCountsTowardUserSeat(user.organizationMembershipStatus),
    ).length;

    if (seatUsed >= subscription.maxUsers) {
      throw new ConflictException(
        `Limite d'utilisateurs atteinte (${subscription.maxUsers} au total, dont ${subscription.includedUsers} inclus dans l'offre ${BASE_SUBSCRIPTION_PLAN.name}). ` +
          `Ajoutez des utilisateurs supplémentaires depuis la page Abonnement.`,
      );
    }
  }
}
