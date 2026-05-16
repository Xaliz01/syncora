import { Injectable } from "@nestjs/common";
import type {
  AssignTeamToVehicleBody,
  AuthUser,
  UpdateVehicleBody,
  VehicleResponse,
  VehicleStatus,
  VehicleType,
} from "@syncora/shared";
import { OrganizationScopedHttpClient } from "../infrastructure/organization-scoped-http.client";
import { AbstractFleetGatewayService } from "./ports/fleet.service.port";

const FLEET_URL = process.env.FLEET_SERVICE_URL ?? "http://localhost:3005";

@Injectable()
export class FleetGatewayService extends AbstractFleetGatewayService {
  constructor(private readonly scopedHttp: OrganizationScopedHttpClient) {
    super();
  }

  private request<T>(
    user: AuthUser,
    params: Omit<
      Parameters<OrganizationScopedHttpClient["request"]>[0],
      "baseUrl" | "organizationId" | "errorLabel"
    >,
  ) {
    return this.scopedHttp.request<T>({
      ...params,
      baseUrl: FLEET_URL,
      organizationId: user.organizationId,
      errorLabel: "Downstream service error",
    });
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
    },
  ): Promise<VehicleResponse> {
    return this.request<VehicleResponse>(currentUser, {
      method: "post",
      path: "/vehicles",
      body: { ...body },
    });
  }

  async listVehicles(currentUser: AuthUser): Promise<VehicleResponse[]> {
    return this.request<VehicleResponse[]>(currentUser, {
      method: "get",
      path: "/vehicles",
    });
  }

  async getVehicle(currentUser: AuthUser, vehicleId: string): Promise<VehicleResponse> {
    return this.request<VehicleResponse>(currentUser, {
      method: "get",
      path: `/vehicles/${vehicleId}`,
    });
  }

  async updateVehicle(
    currentUser: AuthUser,
    vehicleId: string,
    body: UpdateVehicleBody,
  ): Promise<VehicleResponse> {
    return this.request<VehicleResponse>(currentUser, {
      method: "patch",
      path: `/vehicles/${vehicleId}`,
      body,
    });
  }

  async deleteVehicle(currentUser: AuthUser, vehicleId: string): Promise<{ deleted: true }> {
    return this.request<{ deleted: true }>(currentUser, {
      method: "delete",
      path: `/vehicles/${vehicleId}`,
      validateResponseScope: false,
    });
  }

  async assignTeamToVehicle(
    currentUser: AuthUser,
    vehicleId: string,
    body: AssignTeamToVehicleBody,
  ): Promise<VehicleResponse> {
    return this.request<VehicleResponse>(currentUser, {
      method: "put",
      path: `/vehicles/${vehicleId}/assign-team`,
      body,
    });
  }

  async unassignTeamFromVehicle(
    currentUser: AuthUser,
    vehicleId: string,
  ): Promise<VehicleResponse> {
    return this.request<VehicleResponse>(currentUser, {
      method: "delete",
      path: `/vehicles/${vehicleId}/assign-team`,
    });
  }
}
