import { BadRequestException, Injectable } from "@nestjs/common";
import type {
  AuthUser,
  CreateTechnicianBody,
  UpdateTechnicianBody,
  TechnicianResponse,
  UserResponse,
  TechnicianStatus,
  CreateTechnicianUserAccountBody,
} from "@syncora/shared";
import { AbstractTechniciansGatewayService } from "./ports/technicians.service.port";
import { OrganizationScopedHttpClient } from "../infrastructure/organization-scoped-http.client";

const TECHNICIANS_URL = process.env.TECHNICIANS_SERVICE_URL ?? "http://localhost:3006";
const USERS_URL = process.env.USERS_SERVICE_URL ?? "http://localhost:3002";

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
    return this.usersRequest<UserResponse>(organizationId, {
      method: "post",
      path: "/users",
      body: {
        email,
        name,
        password,
        role: "member",
      },
    });
  }
}
