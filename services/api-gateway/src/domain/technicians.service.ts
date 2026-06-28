import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import type {
  AssignUserPermissionsBody,
  AuthUser,
  CreateTechnicianBody,
  CreateTechnicianUserAccountBody,
  OrganizationSubscriptionResponse,
  PermissionProfileResponse,
  TechnicianResponse,
  TechnicianStatus,
  UpdateTechnicianBody,
  UserPermissionAssignmentResponse,
  UserResponse,
} from "@planwise/shared";
import {
  BASE_SUBSCRIPTION_PLAN,
  TECHNICIAN_FIELD_DEFAULT_PERMISSIONS,
  TECHNICIAN_FIELD_PROFILE_NAME,
} from "@planwise/shared";
import { AbstractTechniciansGatewayService } from "./ports/technicians.service.port";
import { OrganizationScopedHttpClient } from "../infrastructure/organization-scoped-http.client";

const TECHNICIANS_URL = process.env.TECHNICIANS_SERVICE_URL ?? "http://localhost:3006";
const USERS_URL = process.env.USERS_SERVICE_URL ?? "http://localhost:3002";
const SUBSCRIPTIONS_URL = process.env.SUBSCRIPTIONS_SERVICE_URL ?? "http://localhost:3008";
const PERMISSIONS_URL = process.env.PERMISSIONS_SERVICE_URL ?? "http://localhost:3003";

@Injectable()
export class TechniciansGatewayService extends AbstractTechniciansGatewayService {
  constructor(private readonly scopedHttp: OrganizationScopedHttpClient) {
    super();
  }

  private techniciansRequest<T>(
    user: AuthUser,
    params: Omit<
      Parameters<OrganizationScopedHttpClient["request"]>[0],
      "baseUrl" | "organizationId" | "errorLabel"
    >,
  ) {
    return this.scopedHttp.request<T>({
      ...params,
      baseUrl: TECHNICIANS_URL,
      organizationId: user.organizationId,
      errorLabel: "Downstream service error",
    });
  }

  private usersRequest<T>(
    organizationId: string,
    params: Omit<
      Parameters<OrganizationScopedHttpClient["request"]>[0],
      "baseUrl" | "organizationId" | "errorLabel"
    >,
  ) {
    return this.scopedHttp.request<T>({
      ...params,
      baseUrl: USERS_URL,
      organizationId,
      errorLabel: "Users service error",
    });
  }

  private subscriptionsRequest<T>(
    organizationId: string,
    params: Omit<
      Parameters<OrganizationScopedHttpClient["request"]>[0],
      "baseUrl" | "organizationId" | "errorLabel"
    >,
  ) {
    return this.scopedHttp.request<T>({
      ...params,
      baseUrl: SUBSCRIPTIONS_URL,
      organizationId,
      errorLabel: "Subscriptions service error",
    });
  }

  private permissionsRequest<T>(
    organizationId: string,
    params: Omit<
      Parameters<OrganizationScopedHttpClient["request"]>[0],
      "baseUrl" | "organizationId" | "errorLabel"
    >,
  ) {
    return this.scopedHttp.request<T>({
      ...params,
      baseUrl: PERMISSIONS_URL,
      organizationId,
      errorLabel: "Permissions service error",
    });
  }

  private async assertOrganizationUserSeatAvailable(organizationId: string): Promise<void> {
    const [subscription, users] = await Promise.all([
      this.subscriptionsRequest<OrganizationSubscriptionResponse>(organizationId, {
        method: "get",
        path: "/subscriptions/current",
      }),
      this.usersRequest<UserResponse[]>(organizationId, {
        method: "get",
        path: "/users",
      }),
    ]);

    if (!subscription.hasAccess) {
      return;
    }

    if (users.length >= subscription.maxUsers) {
      throw new ConflictException(
        `Limite d'utilisateurs atteinte (${subscription.maxUsers} au total, dont ${subscription.includedUsers} inclus dans l'offre ${BASE_SUBSCRIPTION_PLAN.name}). ` +
          `Ajoutez des utilisateurs supplémentaires depuis la page Abonnement.`,
      );
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
      createUserAccount?: boolean;
      userAccountPassword?: string;
    },
  ): Promise<TechnicianResponse> {
    const { createUserAccount, userAccountPassword, ...technicianFields } = body;

    const technician = await this.techniciansRequest<TechnicianResponse>(currentUser, {
      method: "post",
      path: "/technicians",
      body: { ...technicianFields } as CreateTechnicianBody,
    });

    if (createUserAccount && body.email) {
      if (!userAccountPassword) {
        throw new BadRequestException(
          "Un mot de passe est requis pour créer un compte utilisateur",
        );
      }
      const user = await this.createUserForTechnician(
        currentUser.organizationId,
        body.email,
        `${body.firstName} ${body.lastName}`,
        userAccountPassword,
      );
      return this.techniciansRequest<TechnicianResponse>(currentUser, {
        method: "put",
        path: `/technicians/${technician.id}/link-user`,
        body: { userId: user.id },
      });
    }

    return technician;
  }

  async listTechnicians(currentUser: AuthUser): Promise<TechnicianResponse[]> {
    return this.techniciansRequest<TechnicianResponse[]>(currentUser, {
      method: "get",
      path: "/technicians",
    });
  }

  async getTechnician(currentUser: AuthUser, technicianId: string): Promise<TechnicianResponse> {
    return this.techniciansRequest<TechnicianResponse>(currentUser, {
      method: "get",
      path: `/technicians/${technicianId}`,
    });
  }

  async updateTechnician(
    currentUser: AuthUser,
    technicianId: string,
    body: UpdateTechnicianBody,
  ): Promise<TechnicianResponse> {
    return this.techniciansRequest<TechnicianResponse>(currentUser, {
      method: "patch",
      path: `/technicians/${technicianId}`,
      body,
    });
  }

  async deleteTechnician(currentUser: AuthUser, technicianId: string): Promise<{ deleted: true }> {
    return this.techniciansRequest<{ deleted: true }>(currentUser, {
      method: "delete",
      path: `/technicians/${technicianId}`,
      validateResponseScope: false,
    });
  }

  async createTechnicianUserAccount(
    currentUser: AuthUser,
    technicianId: string,
    body: CreateTechnicianUserAccountBody,
  ): Promise<TechnicianResponse> {
    const technician = await this.getTechnician(currentUser, technicianId);
    if (technician.userId) {
      throw new BadRequestException("Ce technicien a déjà un compte utilisateur");
    }
    if (!technician.email) {
      throw new BadRequestException(
        "Le technicien doit avoir une adresse email pour créer un compte",
      );
    }
    const user = await this.createUserForTechnician(
      currentUser.organizationId,
      technician.email,
      `${technician.firstName} ${technician.lastName}`,
      body.password,
    );
    return this.techniciansRequest<TechnicianResponse>(currentUser, {
      method: "put",
      path: `/technicians/${technicianId}/link-user`,
      body: { userId: user.id },
    });
  }

  private async createUserForTechnician(
    organizationId: string,
    email: string,
    name: string,
    password: string,
  ): Promise<UserResponse> {
    await this.assertOrganizationUserSeatAvailable(organizationId);

    const user = await this.usersRequest<UserResponse>(organizationId, {
      method: "post",
      path: "/users",
      body: {
        email,
        name,
        password,
        role: "member",
      },
    });

    await this.assignTechnicianDefaultPermissions(organizationId, user.id);
    return user;
  }

  private async assignTechnicianDefaultPermissions(
    organizationId: string,
    userId: string,
  ): Promise<void> {
    const profileId = await this.ensureTechnicianFieldProfileId(organizationId);
    await this.permissionsRequest<UserPermissionAssignmentResponse>(organizationId, {
      method: "put",
      path: `/assignments/${userId}`,
      body: {
        organizationId,
        userId,
        profileId,
        extraPermissions: [],
        revokedPermissions: [],
      } satisfies AssignUserPermissionsBody,
    });
  }

  private async ensureTechnicianFieldProfileId(organizationId: string): Promise<string> {
    const profiles = await this.permissionsRequest<PermissionProfileResponse[]>(organizationId, {
      method: "get",
      path: "/profiles",
    });
    const existing = profiles.find((profile) => profile.name === TECHNICIAN_FIELD_PROFILE_NAME);
    if (existing) return existing.id;

    try {
      const created = await this.permissionsRequest<PermissionProfileResponse>(organizationId, {
        method: "post",
        path: "/profiles",
        body: {
          organizationId,
          name: TECHNICIAN_FIELD_PROFILE_NAME,
          description:
            "Profil par défaut pour les comptes techniciens (lecture dossiers, interventions, clients).",
          permissions: [...TECHNICIAN_FIELD_DEFAULT_PERMISSIONS],
        },
      });
      return created.id;
    } catch (err) {
      if (err instanceof ConflictException) {
        const refreshed = await this.permissionsRequest<PermissionProfileResponse[]>(
          organizationId,
          {
            method: "get",
            path: "/profiles",
          },
        );
        const profile = refreshed.find((p) => p.name === TECHNICIAN_FIELD_PROFILE_NAME);
        if (profile) return profile.id;
      }
      throw err;
    }
  }
}
