import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  AuthUser,
  CreateVehicleBody,
  UpdateVehicleBody,
  VehicleResponse,
  CreateTechnicianBody,
  UpdateTechnicianBody,
  TechnicianResponse,
  AssignTechnicianToVehicleBody,
  CreateUserBody,
  UserResponse,
  VehicleType,
  VehicleStatus,
  TechnicianStatus,
  CreateTechnicianUserAccountBody
} from "@syncora/shared";
import { AbstractFleetGatewayService } from "./ports/fleet.service.port";

const FLEET_URL = process.env.FLEET_SERVICE_URL ?? "http://localhost:3005";
const USERS_URL = process.env.USERS_SERVICE_URL ?? "http://localhost:3002";

@Injectable()
export class FleetGatewayService extends AbstractFleetGatewayService {
  constructor(private readonly httpService: HttpService) {
    super();
  }

  // ─── Vehicles ───

  async createVehicle(
    currentUser: AuthUser,
    body: {
      type: VehicleType;
      registrationNumber: string;
      brand?: string;
      model?: string;
      year?: number;
      color?: string;
      vin?: string;
      mileage?: number;
      status?: VehicleStatus;
    }
  ): Promise<VehicleResponse> {
    return this.callFleetService<VehicleResponse>({
      method: "post",
      path: "/vehicles",
      body: {
        organizationId: currentUser.organizationId,
        ...body
      } satisfies CreateVehicleBody
    });
  }

  async listVehicles(currentUser: AuthUser): Promise<VehicleResponse[]> {
    return this.callFleetService<VehicleResponse[]>({
      method: "get",
      path: "/vehicles",
      query: { organizationId: currentUser.organizationId }
    });
  }

  async getVehicle(currentUser: AuthUser, vehicleId: string): Promise<VehicleResponse> {
    return this.callFleetService<VehicleResponse>({
      method: "get",
      path: `/vehicles/${vehicleId}`,
      query: { organizationId: currentUser.organizationId }
    });
  }

  async updateVehicle(
    currentUser: AuthUser,
    vehicleId: string,
    body: UpdateVehicleBody
  ): Promise<VehicleResponse> {
    return this.callFleetService<VehicleResponse>({
      method: "patch",
      path: `/vehicles/${vehicleId}`,
      query: { organizationId: currentUser.organizationId },
      body
    });
  }

  async deleteVehicle(
    currentUser: AuthUser,
    vehicleId: string
  ): Promise<{ deleted: true }> {
    return this.callFleetService<{ deleted: true }>({
      method: "delete",
      path: `/vehicles/${vehicleId}`,
      query: { organizationId: currentUser.organizationId }
    });
  }

  async assignTechnicianToVehicle(
    currentUser: AuthUser,
    vehicleId: string,
    body: AssignTechnicianToVehicleBody
  ): Promise<VehicleResponse> {
    return this.callFleetService<VehicleResponse>({
      method: "put",
      path: `/vehicles/${vehicleId}/assign`,
      query: { organizationId: currentUser.organizationId },
      body
    });
  }

  async unassignTechnicianFromVehicle(
    currentUser: AuthUser,
    vehicleId: string
  ): Promise<VehicleResponse> {
    return this.callFleetService<VehicleResponse>({
      method: "delete",
      path: `/vehicles/${vehicleId}/assign`,
      query: { organizationId: currentUser.organizationId }
    });
  }

  // ─── Technicians ───

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
    }
  ): Promise<TechnicianResponse> {
    const { createUserAccount, userAccountPassword, ...technicianFields } = body;

    const technician = await this.callFleetService<TechnicianResponse>({
      method: "post",
      path: "/technicians",
      body: {
        organizationId: currentUser.organizationId,
        ...technicianFields
      } satisfies CreateTechnicianBody
    });

    if (createUserAccount && body.email) {
      if (!userAccountPassword) {
        throw new BadRequestException(
          "Un mot de passe est requis pour créer un compte utilisateur"
        );
      }
      const user = await this.createUserForTechnician(
        currentUser.organizationId,
        body.email,
        `${body.firstName} ${body.lastName}`,
        userAccountPassword
      );
      return this.callFleetService<TechnicianResponse>({
        method: "put",
        path: `/technicians/${technician.id}/link-user`,
        query: { organizationId: currentUser.organizationId },
        body: { userId: user.id }
      });
    }

    return technician;
  }

  async listTechnicians(currentUser: AuthUser): Promise<TechnicianResponse[]> {
    return this.callFleetService<TechnicianResponse[]>({
      method: "get",
      path: "/technicians",
      query: { organizationId: currentUser.organizationId }
    });
  }

  async getTechnician(
    currentUser: AuthUser,
    technicianId: string
  ): Promise<TechnicianResponse> {
    return this.callFleetService<TechnicianResponse>({
      method: "get",
      path: `/technicians/${technicianId}`,
      query: { organizationId: currentUser.organizationId }
    });
  }

  async updateTechnician(
    currentUser: AuthUser,
    technicianId: string,
    body: UpdateTechnicianBody
  ): Promise<TechnicianResponse> {
    return this.callFleetService<TechnicianResponse>({
      method: "patch",
      path: `/technicians/${technicianId}`,
      query: { organizationId: currentUser.organizationId },
      body
    });
  }

  async deleteTechnician(
    currentUser: AuthUser,
    technicianId: string
  ): Promise<{ deleted: true }> {
    return this.callFleetService<{ deleted: true }>({
      method: "delete",
      path: `/technicians/${technicianId}`,
      query: { organizationId: currentUser.organizationId }
    });
  }

  async createTechnicianUserAccount(
    currentUser: AuthUser,
    technicianId: string,
    body: CreateTechnicianUserAccountBody
  ): Promise<TechnicianResponse> {
    const technician = await this.getTechnician(currentUser, technicianId);
    if (technician.userId) {
      throw new BadRequestException("Ce technicien a déjà un compte utilisateur");
    }
    if (!technician.email) {
      throw new BadRequestException(
        "Le technicien doit avoir une adresse email pour créer un compte"
      );
    }
    const user = await this.createUserForTechnician(
      currentUser.organizationId,
      technician.email,
      `${technician.firstName} ${technician.lastName}`,
      body.password
    );
    return this.callFleetService<TechnicianResponse>({
      method: "put",
      path: `/technicians/${technicianId}/link-user`,
      query: { organizationId: currentUser.organizationId },
      body: { userId: user.id }
    });
  }

  // ─── Helpers ───

  private async createUserForTechnician(
    organizationId: string,
    email: string,
    name: string,
    password: string
  ): Promise<UserResponse> {
    return this.callUsersService<UserResponse>({
      method: "post",
      path: "/users",
      body: {
        organizationId,
        email,
        name,
        password,
        role: "member"
      } satisfies CreateUserBody
    });
  }

  private async callFleetService<T>(params: {
    method: "get" | "post" | "patch" | "put" | "delete";
    path: string;
    body?: unknown;
    query?: Record<string, unknown>;
  }): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.request<T>({
          method: params.method,
          url: `${FLEET_URL}${params.path}`,
          data: params.body,
          params: params.query
        })
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
          params: params.query
        })
      );
      return response.data;
    } catch (err: unknown) {
      this.rethrowAsHttpException(err);
    }
  }

  private rethrowAsHttpException(err: unknown): never {
    const status = (err as { response?: { status?: number } })?.response?.status;
    const message =
      (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message ?? "Downstream service error";

    if (status === 400) throw new BadRequestException(message);
    if (status === 403) throw new ForbiddenException(message);
    if (status === 404) throw new NotFoundException(message);
    if (status === 409) throw new ConflictException(message);
    throw err;
  }
}
