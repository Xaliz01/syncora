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
  CreateTeamBody,
  UpdateTeamBody,
  TeamResponse,
  TeamStatus
} from "@syncora/shared";
import { AbstractTeamsGatewayService } from "./ports/teams.service.port";

const TECHNICIANS_URL = process.env.TECHNICIANS_SERVICE_URL ?? "http://localhost:3006";

@Injectable()
export class TeamsGatewayService extends AbstractTeamsGatewayService {
  constructor(private readonly httpService: HttpService) {
    super();
  }

  async createTeam(
    currentUser: AuthUser,
    body: {
      name: string;
      agenceId?: string;
      technicianIds?: string[];
      status?: TeamStatus;
      calendarColor?: string;
    }
  ): Promise<TeamResponse> {
    return this.call<TeamResponse>({
      method: "post",
      path: "/teams",
      body: {
        organizationId: currentUser.organizationId,
        ...body
      } satisfies CreateTeamBody
    });
  }

  async listTeams(currentUser: AuthUser): Promise<TeamResponse[]> {
    return this.call<TeamResponse[]>({
      method: "get",
      path: "/teams",
      query: { organizationId: currentUser.organizationId }
    });
  }

  async getTeam(currentUser: AuthUser, teamId: string): Promise<TeamResponse> {
    return this.call<TeamResponse>({
      method: "get",
      path: `/teams/${teamId}`,
      query: { organizationId: currentUser.organizationId }
    });
  }

  async updateTeam(
    currentUser: AuthUser,
    teamId: string,
    body: UpdateTeamBody
  ): Promise<TeamResponse> {
    return this.call<TeamResponse>({
      method: "patch",
      path: `/teams/${teamId}`,
      query: { organizationId: currentUser.organizationId },
      body
    });
  }

  async deleteTeam(
    currentUser: AuthUser,
    teamId: string
  ): Promise<{ deleted: true }> {
    return this.call<{ deleted: true }>({
      method: "delete",
      path: `/teams/${teamId}`,
      query: { organizationId: currentUser.organizationId }
    });
  }

  async addMember(
    currentUser: AuthUser,
    teamId: string,
    technicianId: string
  ): Promise<TeamResponse> {
    return this.call<TeamResponse>({
      method: "put",
      path: `/teams/${teamId}/members/${technicianId}`,
      query: { organizationId: currentUser.organizationId }
    });
  }

  async removeMember(
    currentUser: AuthUser,
    teamId: string,
    technicianId: string
  ): Promise<TeamResponse> {
    return this.call<TeamResponse>({
      method: "delete",
      path: `/teams/${teamId}/members/${technicianId}`,
      query: { organizationId: currentUser.organizationId }
    });
  }

  private async call<T>(params: {
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
