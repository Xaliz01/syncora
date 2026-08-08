import { Injectable } from "@nestjs/common";
import type {
  AuthUser,
  CreateTeamBody,
  TeamResponse,
  TeamStatus,
  UpdateTeamBody,
} from "@planwise/shared";
import { OrganizationScopedHttpClient } from "../infrastructure/organization-scoped-http.client";
import { AbstractTeamsGatewayService } from "./ports/teams.service.port";
import { SERVICE_URLS } from "../infrastructure/service-urls.config";

@Injectable()
export class TeamsGatewayService extends AbstractTeamsGatewayService {
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
      baseUrl: SERVICE_URLS.technicians,
      organizationId: user.organizationId,
      errorLabel: "Downstream service error",
    });
  }

  async createTeam(
    currentUser: AuthUser,
    body: {
      name: string;
      agenceId?: string;
      technicianIds?: string[];
      status?: TeamStatus;
      calendarColor?: string;
    },
  ): Promise<TeamResponse> {
    return this.request<TeamResponse>(currentUser, {
      method: "post",
      path: "/teams",
      body: { ...body } as CreateTeamBody,
    });
  }

  async listTeams(currentUser: AuthUser): Promise<TeamResponse[]> {
    return this.request<TeamResponse[]>(currentUser, {
      method: "get",
      path: "/teams",
    });
  }

  async getTeam(currentUser: AuthUser, teamId: string): Promise<TeamResponse> {
    return this.request<TeamResponse>(currentUser, {
      method: "get",
      path: `/teams/${teamId}`,
    });
  }

  async updateTeam(
    currentUser: AuthUser,
    teamId: string,
    body: UpdateTeamBody,
  ): Promise<TeamResponse> {
    return this.request<TeamResponse>(currentUser, {
      method: "patch",
      path: `/teams/${teamId}`,
      body,
    });
  }

  async deleteTeam(currentUser: AuthUser, teamId: string): Promise<{ deleted: true }> {
    return this.request<{ deleted: true }>(currentUser, {
      method: "delete",
      path: `/teams/${teamId}`,
      validateResponseScope: false,
    });
  }

  async addMember(
    currentUser: AuthUser,
    teamId: string,
    technicianId: string,
  ): Promise<TeamResponse> {
    return this.request<TeamResponse>(currentUser, {
      method: "put",
      path: `/teams/${teamId}/members/${technicianId}`,
    });
  }

  async removeMember(
    currentUser: AuthUser,
    teamId: string,
    technicianId: string,
  ): Promise<TeamResponse> {
    return this.request<TeamResponse>(currentUser, {
      method: "delete",
      path: `/teams/${teamId}/members/${technicianId}`,
    });
  }
}
