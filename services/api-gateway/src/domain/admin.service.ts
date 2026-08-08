import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  AssignUserPermissionsBody,
  AuthUser,
  CancelInvitationResponse,
  CreateInvitationBody,
  CreateInvitedUserBody,
  CreatePermissionProfileBody,
  EffectivePermissionsResponse,
  InvitationResponse,
  OrganizationMembershipResponse,
  OrganizationSubscriptionResponse,
  ResendInvitationResponse,
  SendEmailNotificationResponse,
  UpdatePendingInvitationBody,
  UpdatePendingInvitationResponse,
  UpdatePermissionProfileBody,
  UserPermissionAssignmentResponse,
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
import { SERVICE_URLS } from "../infrastructure/service-urls.config";

@Injectable()
export class AdminService extends AbstractAdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly httpService: HttpService) {
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
    const invitedUser = await this.callUsersService<UserResponse>({
      method: "post",
      path: "/users/invite",
      body: createInvitedUserBody,
    });

    const assignment =
      invitedUser.role === "admin"
        ? {
            organizationId: currentUser.organizationId,
            userId: invitedUser.id,
            extraPermissions: [],
            revokedPermissions: [],
            effectivePermissions: [...ASSIGNABLE_PERMISSION_CODES],
          }
        : await this.callPermissionsService<UserPermissionAssignmentResponse>({
            method: "put",
            path: `/assignments/${invitedUser.id}`,
            body: {
              organizationId: currentUser.organizationId,
              userId: invitedUser.id,
              profileId: body.profileId ?? null,
              extraPermissions: body.extraPermissions ?? [],
              revokedPermissions: body.revokedPermissions ?? [],
            } satisfies AssignUserPermissionsBody,
          });

    const invitation = await this.callPermissionsService<InvitationResponse>({
      method: "post",
      path: "/invitations",
      body: {
        organizationId: currentUser.organizationId,
        invitedUserId: invitedUser.id,
        invitedEmail: invitedUser.email,
        invitedName: invitedUser.name,
        invitedByUserId: currentUser.id,
        profileId: invitedUser.role === "admin" ? undefined : body.profileId,
        extraPermissions: invitedUser.role === "admin" ? [] : (body.extraPermissions ?? []),
        revokedPermissions: invitedUser.role === "admin" ? [] : (body.revokedPermissions ?? []),
      } satisfies CreateInvitationBody,
    });

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
    const invitation = await this.callPermissionsService<InvitationResponse>({
      method: "get",
      path: `/invitations/${invitationId}`,
      query: { organizationId: currentUser.organizationId },
    });

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
    const invitation = await this.callPermissionsService<InvitationResponse>({
      method: "get",
      path: `/invitations/${invitationId}`,
      query: { organizationId: currentUser.organizationId },
    });

    if (invitation.status !== "pending") {
      throw new BadRequestException("Seules les invitations en attente peuvent être modifiées");
    }

    await this.callUsersService<UserResponse>({
      method: "patch",
      path: `/users/${invitation.invitedUserId}/invited-email`,
      body: {
        organizationId: currentUser.organizationId,
        email: body.email,
      },
    });

    const updatedInvitation = await this.callPermissionsService<InvitationResponse>({
      method: "patch",
      path: `/invitations/${invitationId}`,
      body: {
        organizationId: currentUser.organizationId,
        email: body.email,
      },
    });

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
    const invitation = await this.callPermissionsService<InvitationResponse>({
      method: "get",
      path: `/invitations/${invitationId}`,
      query: { organizationId: currentUser.organizationId },
    });

    if (invitation.status !== "pending") {
      throw new BadRequestException("Seules les invitations en attente peuvent être annulées");
    }

    await this.callPermissionsService<InvitationResponse>({
      method: "post",
      path: `/invitations/${invitationId}/cancel`,
      body: { organizationId: currentUser.organizationId },
    });

    await this.callUsersService({
      method: "post",
      path: `/users/${invitation.invitedUserId}/cancel-organization-invitation`,
      body: { organizationId: currentUser.organizationId },
    });

    await this.callPermissionsService({
      method: "delete",
      path: `/assignments/${invitation.invitedUserId}`,
      query: { organizationId: currentUser.organizationId },
    });

    return { ok: true };
  }

  async deactivateOrganizationUser(currentUser: AuthUser, userId: string) {
    if (userId === currentUser.id) {
      throw new BadRequestException("Vous ne pouvez pas désactiver votre propre compte");
    }

    const user = await this.callUsersService<UserResponse>({
      method: "post",
      path: `/users/${userId}/deactivate-organization-membership`,
      body: { organizationId: currentUser.organizationId },
    });

    return { user };
  }

  async reactivateOrganizationUser(currentUser: AuthUser, userId: string) {
    await this.assertOrganizationUserSeatAvailable(currentUser.organizationId);

    const user = await this.callUsersService<UserResponse>({
      method: "post",
      path: `/users/${userId}/reactivate-organization-membership`,
      body: { organizationId: currentUser.organizationId },
    });

    return { user };
  }

  async listOrganizationUsers(currentUser: AuthUser) {
    const users = await this.callUsersService<UserResponse[]>({
      method: "get",
      path: "/users",
      query: { organizationId: currentUser.organizationId },
    });

    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        const [assignment, effectivePermissions] = await Promise.all([
          this.callPermissionsService<UserPermissionAssignmentResponse>({
            method: "get",
            path: `/assignments/${user.id}`,
            query: { organizationId: currentUser.organizationId },
          }),
          this.callPermissionsService<EffectivePermissionsResponse>({
            method: "post",
            path: "/permissions/effective",
            body: {
              organizationId: currentUser.organizationId,
              userId: user.id,
              role: user.role,
            },
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
      this.callUsersService<UserResponse>({
        method: "get",
        path: `/users/${userId}`,
      }),
      this.callUsersService<OrganizationMembershipResponse[]>({
        method: "get",
        path: `/users/${userId}/organization-memberships`,
      }),
    ]);

    const membershipForOrg = memberships.find(
      (row) => row.organizationId === currentUser.organizationId,
    );
    if (!membershipForOrg) {
      throw new ForbiddenException(
        "Impossible d'accéder à un utilisateur d'une autre organisation",
      );
    }

    const [assignment, effectivePermissions] = await Promise.all([
      this.callPermissionsService<UserPermissionAssignmentResponse>({
        method: "get",
        path: `/assignments/${user.id}`,
        query: { organizationId: currentUser.organizationId },
      }),
      this.callPermissionsService<EffectivePermissionsResponse>({
        method: "post",
        path: "/permissions/effective",
        body: {
          organizationId: currentUser.organizationId,
          userId: user.id,
          role: membershipForOrg.role,
        },
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

    const targetUser = await this.callUsersService<UserResponse>({
      method: "get",
      path: `/users/${userId}`,
    });
    if (targetUser.organizationId !== currentUser.organizationId) {
      throw new ForbiddenException("Impossible de gérer un utilisateur d'une autre organisation");
    }
    if (targetUser.role === "admin") {
      throw new BadRequestException(
        "Les administrateurs d'organisation ont tous les droits et ne peuvent pas avoir de profils/permissions personnalisés",
      );
    }

    const assignment = await this.callPermissionsService<UserPermissionAssignmentResponse>({
      method: "put",
      path: `/assignments/${userId}`,
      body: {
        organizationId: currentUser.organizationId,
        userId,
        profileId: body.profileId ?? null,
        extraPermissions: body.extraPermissions ?? [],
        revokedPermissions: body.revokedPermissions ?? [],
      } satisfies AssignUserPermissionsBody,
    });

    const effectivePermissions = await this.callPermissionsService<EffectivePermissionsResponse>({
      method: "post",
      path: "/permissions/effective",
      body: {
        organizationId: currentUser.organizationId,
        userId,
        role: targetUser.role,
      },
    });

    return {
      userId,
      role: targetUser.role,
      assignment,
      effectivePermissions: effectivePermissions.permissions,
    };
  }

  async createPermissionProfile(currentUser: AuthUser, body: CreatePermissionProfileForOrgBody) {
    return this.callPermissionsService({
      method: "post",
      path: "/profiles",
      body: {
        organizationId: currentUser.organizationId,
        name: body.name,
        description: body.description,
        permissions: body.permissions,
      } satisfies CreatePermissionProfileBody,
    });
  }

  async listPermissionProfiles(currentUser: AuthUser) {
    return this.callPermissionsService({
      method: "get",
      path: "/profiles",
      query: { organizationId: currentUser.organizationId },
    });
  }

  async getPermissionProfile(currentUser: AuthUser, profileId: string) {
    return this.callPermissionsService({
      method: "get",
      path: `/profiles/${profileId}`,
      query: { organizationId: currentUser.organizationId },
    });
  }

  async updatePermissionProfile(
    currentUser: AuthUser,
    profileId: string,
    body: UpdatePermissionProfileForOrgBody,
  ) {
    return this.callPermissionsService({
      method: "patch",
      path: `/profiles/${profileId}`,
      body: {
        organizationId: currentUser.organizationId,
        ...body,
      } satisfies UpdatePermissionProfileBody,
    });
  }

  async deletePermissionProfile(currentUser: AuthUser, profileId: string) {
    return this.callPermissionsService({
      method: "delete",
      path: `/profiles/${profileId}`,
      query: { organizationId: currentUser.organizationId },
    });
  }

  async listInvitations(currentUser: AuthUser, status?: "pending" | "accepted" | "cancelled") {
    return this.callPermissionsService({
      method: "get",
      path: "/invitations",
      query: { organizationId: currentUser.organizationId, status },
    });
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
      const res = await firstValueFrom(
        this.httpService.post<SendEmailNotificationResponse>(
          `${SERVICE_URLS.notifications}/email/transactional`,
          {
            to: invitation.invitedEmail,
            subject: "Invitation à rejoindre Planwise",
            body,
            url: acceptPath,
            ctaLabel: "Accepter l'invitation",
          },
        ),
      );
      if (!res.data.sent) {
        this.logger.warn(
          `Invitation email not sent to ${invitation.invitedEmail}: ${res.data.reason ?? "unknown"}`,
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
      this.callSubscriptionsService<OrganizationSubscriptionResponse>({
        method: "get",
        path: "/subscriptions/current",
        query: { organizationId },
      }),
      this.callUsersService<UserResponse[]>({
        method: "get",
        path: "/users",
        query: { organizationId },
      }),
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

  private async callSubscriptionsService<T>(params: {
    method: "get" | "post";
    path: string;
    body?: unknown;
    query?: Record<string, unknown>;
  }): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.request<T>({
          method: params.method,
          url: `${SERVICE_URLS.subscriptions}${params.path}`,
          data: params.body,
          params: params.query,
        }),
      );
      return response.data;
    } catch (err: unknown) {
      this.rethrowAsHttpException(err);
    }
  }

  private async callUsersService<T>(params: {
    method: "get" | "post" | "patch" | "put" | "delete";
    path: string;
    body?: unknown;
    query?: Record<string, unknown>;
  }): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.request<T>({
          method: params.method,
          url: `${SERVICE_URLS.users}${params.path}`,
          data: params.body,
          params: params.query,
        }),
      );
      return response.data;
    } catch (err: unknown) {
      this.rethrowAsHttpException(err);
    }
  }

  private async callPermissionsService<T>(params: {
    method: "get" | "post" | "patch" | "put" | "delete";
    path: string;
    body?: unknown;
    query?: Record<string, unknown>;
  }): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.request<T>({
          method: params.method,
          url: `${SERVICE_URLS.permissions}${params.path}`,
          data: params.body,
          params: params.query,
        }),
      );
      return response.data;
    } catch (err: unknown) {
      this.rethrowAsHttpException(err);
    }
  }

  private rethrowAsHttpException(err: unknown): never {
    const status = (err as { response?: { status?: number } })?.response?.status;
    const message =
      (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message ??
      "Downstream service error";

    if (status === 400) throw new BadRequestException(message);
    if (status === 403) throw new ForbiddenException(message);
    if (status === 404) throw new NotFoundException(message);
    if (status === 409) throw new ConflictException(message);
    throw err;
  }
}
