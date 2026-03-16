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
  AssignTeamToVehicleBody,
  VehicleType,
  VehicleStatus
} from "@syncora/shared";
import { AbstractFleetGatewayService } from "./ports/fleet.service.port";

const FLEET_URL = process.env.FLEET_SERVICE_URL ?? "http://localhost:3005";

@Injectable()
export class FleetGatewayService extends AbstractFleetGatewayService {
  constructor(private readonly httpService: HttpService) {
    super();
  }

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

  async assignTeamToVehicle(
    currentUser: AuthUser,
    vehicleId: string,
    body: AssignTeamToVehicleBody
  ): Promise<VehicleResponse> {
    return this.callFleetService<VehicleResponse>({
      method: "put",
      path: `/vehicles/${vehicleId}/assign-team`,
      query: { organizationId: currentUser.organizationId },
      body
    });
  }

  async unassignTeamFromVehicle(
    currentUser: AuthUser,
    vehicleId: string
  ): Promise<VehicleResponse> {
    return this.callFleetService<VehicleResponse>({
      method: "delete",
      path: `/vehicles/${vehicleId}/assign-team`,
      query: { organizationId: currentUser.organizationId }
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
