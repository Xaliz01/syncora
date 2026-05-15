import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  AuthUser,
  CreateTechnicianBody,
  UpdateTechnicianBody,
  TechnicianResponse,
  CreateUserBody,
  UserResponse,
  TechnicianStatus,
  CreateTechnicianUserAccountBody,
} from "@syncora/shared";
import { AbstractTechniciansGatewayService } from "./ports/technicians.service.port";

const TECHNICIANS_URL = process.env.TECHNICIANS_SERVICE_URL ?? "http://localhost:3006";
const USERS_URL = process.env.USERS_SERVICE_URL ?? "http://localhost:3002";

@Injectable()
export class TechniciansGatewayService extends AbstractTechniciansGatewayService {
  constructor(private readonly httpService: HttpService) {
    super();
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

    const technician = await this.callTechniciansService<TechnicianResponse>({
      method: "post",
      path: "/technicians",
      body: {
        organizationId: currentUser.organizationId,
        ...technicianFields,
      } satisfies CreateTechnicianBody,
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
      return this.callTechniciansService<TechnicianResponse>({
        method: "put",
        path: `/technicians/${technician.id}/link-user`,
        query: { organizationId: currentUser.organizationId },
        body: { userId: user.id },
      });
    }

    return technician;
  }

  async listTechnicians(currentUser: AuthUser): Promise<TechnicianResponse[]> {
    return this.callTechniciansService<TechnicianResponse[]>({
      method: "get",
      path: "/technicians",
      query: { organizationId: currentUser.organizationId },
    });
  }

  async getTechnician(currentUser: AuthUser, technicianId: string): Promise<TechnicianResponse> {
    return this.callTechniciansService<TechnicianResponse>({
      method: "get",
      path: `/technicians/${technicianId}`,
      query: { organizationId: currentUser.organizationId },
    });
  }

  async updateTechnician(
    currentUser: AuthUser,
    technicianId: string,
    body: UpdateTechnicianBody,
  ): Promise<TechnicianResponse> {
    return this.callTechniciansService<TechnicianResponse>({
      method: "patch",
      path: `/technicians/${technicianId}`,
      query: { organizationId: currentUser.organizationId },
      body,
    });
  }

  async deleteTechnician(currentUser: AuthUser, technicianId: string): Promise<{ deleted: true }> {
    return this.callTechniciansService<{ deleted: true }>({
      method: "delete",
      path: `/technicians/${technicianId}`,
      query: { organizationId: currentUser.organizationId },
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
    return this.callTechniciansService<TechnicianResponse>({
      method: "put",
      path: `/technicians/${technicianId}/link-user`,
      query: { organizationId: currentUser.organizationId },
      body: { userId: user.id },
    });
  }

  private async createUserForTechnician(
    organizationId: string,
    email: string,
    name: string,
    password: string,
  ): Promise<UserResponse> {
    return this.callUsersService<UserResponse>({
      method: "post",
      path: "/users",
      body: {
        organizationId,
        email,
        name,
        password,
        role: "member",
      } satisfies CreateUserBody,
    });
  }

  private async callTechniciansService<T>(params: {
    method: "get" | "post" | "patch" | "put" | "delete";
    path: string;
    body?: unknown;
    query?: Record<string, unknown>;
  }): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.request<T>({
          method: params.method,
          url: `${TECHNICIANS_URL}${params.path}`,
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
          url: `${USERS_URL}${params.path}`,
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
