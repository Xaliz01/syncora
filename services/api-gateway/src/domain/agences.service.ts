import { Injectable } from "@nestjs/common";
import type { AgenceResponse, AuthUser, CreateAgenceBody, UpdateAgenceBody } from "@syncora/shared";
import { OrganizationScopedHttpClient } from "../infrastructure/organization-scoped-http.client";
import { AbstractAgencesGatewayService } from "./ports/agences.service.port";

const TECHNICIANS_URL = process.env.TECHNICIANS_SERVICE_URL ?? "http://localhost:3006";

@Injectable()
export class AgencesGatewayService extends AbstractAgencesGatewayService {
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
      baseUrl: TECHNICIANS_URL,
      organizationId: user.organizationId,
      errorLabel: "Downstream service error",
    });
  }

  async createAgence(
    currentUser: AuthUser,
    body: {
      name: string;
      address?: string;
      city?: string;
      postalCode?: string;
      phone?: string;
    },
  ): Promise<AgenceResponse> {
    return this.request<AgenceResponse>(currentUser, {
      method: "post",
      path: "/agences",
      body: { ...body } as CreateAgenceBody,
    });
  }

  async listAgences(currentUser: AuthUser): Promise<AgenceResponse[]> {
    return this.request<AgenceResponse[]>(currentUser, {
      method: "get",
      path: "/agences",
    });
  }

  async getAgence(currentUser: AuthUser, agenceId: string): Promise<AgenceResponse> {
    return this.request<AgenceResponse>(currentUser, {
      method: "get",
      path: `/agences/${agenceId}`,
    });
  }

  async updateAgence(
    currentUser: AuthUser,
    agenceId: string,
    body: UpdateAgenceBody,
  ): Promise<AgenceResponse> {
    return this.request<AgenceResponse>(currentUser, {
      method: "patch",
      path: `/agences/${agenceId}`,
      body,
    });
  }

  async deleteAgence(currentUser: AuthUser, agenceId: string): Promise<{ deleted: true }> {
    return this.request<{ deleted: true }>(currentUser, {
      method: "delete",
      path: `/agences/${agenceId}`,
      validateResponseScope: false,
    });
  }
}
