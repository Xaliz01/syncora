import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import type {
  AuthUser,
  CreateTechnicianBody,
  CreateTechnicianUserAccountResponse,
  InvitationResponse,
  TechnicianLinkedUser,
  TechnicianResponse,
  TechnicianStatus,
  UpdateTechnicianBody,
  UserPermissionAssignmentResponse,
  UserResponse,
} from "@planwise/shared";
import {
  TECHNICIAN_FIELD_DEFAULT_PERMISSIONS,
  TECHNICIAN_FIELD_PROFILE_NAME,
} from "@planwise/shared";
import { AbstractTechniciansGatewayService } from "./ports/technicians.service.port";
import { AbstractAdminService } from "./ports/admin.service.port";
import { AbstractTechniciansService } from "./technicians/ports/technicians.service.port";
import { AbstractUsersService } from "./users/ports/users.service.port";
import { AbstractPermissionsService } from "./permissions/ports/permissions.service.port";

@Injectable()
export class TechniciansGatewayService extends AbstractTechniciansGatewayService {
  constructor(
    private readonly adminService: AbstractAdminService,
    private readonly techniciansService: AbstractTechniciansService,
    private readonly users: AbstractUsersService,
    private readonly permissions: AbstractPermissionsService,
  ) {
    super();
  }

  private toLinkedUser(user: UserResponse): TechnicianLinkedUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      organizationMembershipStatus: user.organizationMembershipStatus,
    };
  }

  private async withLinkedUser(
    currentUser: AuthUser,
    technician: TechnicianResponse,
  ): Promise<TechnicianResponse> {
    if (!technician.userId) return technician;
    try {
      const user = await this.users.findById(technician.userId, currentUser.organizationId);
      if (!user) return technician;
      return { ...technician, linkedUser: this.toLinkedUser(user) };
    } catch {
      return technician;
    }
  }

  async createTechnician(
    currentUser: AuthUser,
    body: {
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      speciality?: string;
      status?: TechnicianStatus;
      calendarColor?: string;
      createUserAccount?: boolean;
    },
  ): Promise<TechnicianResponse> {
    const { createUserAccount, ...technicianFields } = body;

    const technician = await this.techniciansService.createTechnician({
      ...technicianFields,
      organizationId: currentUser.organizationId,
    } as CreateTechnicianBody);

    if (createUserAccount) {
      const invited = await this.inviteAndLinkTechnicianAccount(currentUser, technician);
      // Conserver firstName en racine pour @NotifyEntity ; exposer le résultat d’envoi d’e-mail.
      return {
        ...invited.technician,
        emailSent: invited.emailSent,
        invitationId: invited.invitationId,
      } as TechnicianResponse & { emailSent: boolean; invitationId: string };
    }

    return technician;
  }

  async listTechnicians(currentUser: AuthUser): Promise<TechnicianResponse[]> {
    return this.techniciansService.listTechnicians(currentUser.organizationId);
  }

  async getTechnician(currentUser: AuthUser, technicianId: string): Promise<TechnicianResponse> {
    const technician = await this.techniciansService.getTechnician(
      currentUser.organizationId,
      technicianId,
    );
    return this.withLinkedUser(currentUser, technician);
  }

  async updateTechnician(
    currentUser: AuthUser,
    technicianId: string,
    body: UpdateTechnicianBody,
  ): Promise<TechnicianResponse> {
    const technician = await this.techniciansService.updateTechnician(
      currentUser.organizationId,
      technicianId,
      body,
    );
    return this.withLinkedUser(currentUser, technician);
  }

  async deleteTechnician(currentUser: AuthUser, technicianId: string): Promise<{ deleted: true }> {
    return this.techniciansService.deleteTechnician(currentUser.organizationId, technicianId);
  }

  async createTechnicianUserAccount(
    currentUser: AuthUser,
    technicianId: string,
  ): Promise<CreateTechnicianUserAccountResponse> {
    const technician = await this.getTechnician(currentUser, technicianId);
    if (technician.userId) {
      throw new BadRequestException("Ce technicien a déjà un compte utilisateur");
    }
    return this.inviteAndLinkTechnicianAccount(currentUser, technician);
  }

  async linkTechnicianUser(
    currentUser: AuthUser,
    technicianId: string,
    userId: string,
  ): Promise<TechnicianResponse> {
    const technician = await this.getTechnician(currentUser, technicianId);
    if (technician.userId) {
      throw new BadRequestException("Ce technicien a déjà un compte utilisateur associé");
    }

    const trimmedUserId = userId.trim();
    if (!trimmedUserId) {
      throw new BadRequestException("userId est requis");
    }

    const user = await this.users.findById(trimmedUserId, currentUser.organizationId);
    if (!user) {
      throw new BadRequestException("Cet utilisateur n'appartient pas à votre organisation");
    }

    const memberships = await this.users.listOrganizationMemberships(trimmedUserId);
    const membership = memberships.find((row) => row.organizationId === currentUser.organizationId);
    if (!membership) {
      throw new BadRequestException("Cet utilisateur n'appartient pas à votre organisation");
    }
    if (membership.membershipStatus === "disabled") {
      throw new BadRequestException("Impossible de lier un utilisateur désactivé");
    }

    const alreadyLinked = await this.techniciansService.findByUserId(
      currentUser.organizationId,
      trimmedUserId,
    );
    if (alreadyLinked) {
      throw new ConflictException("Cet utilisateur est déjà lié à un autre technicien");
    }

    const linked = await this.techniciansService.linkUserToTechnician(
      currentUser.organizationId,
      technicianId,
      trimmedUserId,
    );

    return {
      ...linked,
      linkedUser: this.toLinkedUser({
        ...user,
        organizationId: currentUser.organizationId,
        role: membership.role,
        organizationMembershipStatus: membership.membershipStatus,
      }),
    };
  }

  /**
   * Même parcours que l’invitation admin : user invité + profil + e-mail d’activation,
   * puis liaison du technicien au user créé.
   */
  private async inviteAndLinkTechnicianAccount(
    currentUser: AuthUser,
    technician: TechnicianResponse,
  ): Promise<CreateTechnicianUserAccountResponse> {
    if (!technician.email?.trim()) {
      throw new BadRequestException(
        "Le technicien doit avoir une adresse email pour inviter un compte",
      );
    }

    const profileId = await this.ensureTechnicianFieldProfileId(currentUser.organizationId);
    const inviteResult = (await this.adminService.inviteUser(currentUser, {
      email: technician.email.trim(),
      name: `${technician.firstName} ${technician.lastName}`.trim(),
      role: "member",
      profileId,
    })) as {
      invitedUser: UserResponse;
      assignment: UserPermissionAssignmentResponse;
      invitation: InvitationResponse;
      emailSent: boolean;
    };

    const linked = await this.techniciansService.linkUserToTechnician(
      currentUser.organizationId,
      technician.id,
      inviteResult.invitedUser.id,
    );

    return {
      technician: {
        ...linked,
        linkedUser: this.toLinkedUser({
          ...inviteResult.invitedUser,
          organizationMembershipStatus:
            inviteResult.invitedUser.organizationMembershipStatus ?? "invited",
        }),
      },
      emailSent: inviteResult.emailSent,
      invitationId: inviteResult.invitation.id,
    };
  }

  private async ensureTechnicianFieldProfileId(organizationId: string): Promise<string> {
    const profiles = await this.permissions.listProfiles(organizationId);
    const existing = profiles.find((profile) => profile.name === TECHNICIAN_FIELD_PROFILE_NAME);
    if (existing) return existing.id;

    try {
      const created = await this.permissions.createProfile({
        organizationId,
        name: TECHNICIAN_FIELD_PROFILE_NAME,
        description:
          "Profil par défaut pour les comptes techniciens (lecture dossiers, interventions, clients).",
        permissions: [...TECHNICIAN_FIELD_DEFAULT_PERMISSIONS],
      });
      return created.id;
    } catch (err) {
      if (err instanceof ConflictException) {
        const refreshed = await this.permissions.listProfiles(organizationId);
        const profile = refreshed.find((p) => p.name === TECHNICIAN_FIELD_PROFILE_NAME);
        if (profile) return profile.id;
      }
      throw err;
    }
  }
}
