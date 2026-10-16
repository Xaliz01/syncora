import { Injectable } from "@nestjs/common";
import type {
  AuthUser,
  CreateTeamBody,
  TeamResponse,
  TeamStatus,
  UpdateTeamBody,
} from "@planwise/shared";
import { AbstractTeamsGatewayService } from "./ports/teams.service.port";
import { AbstractTeamsService } from "./technicians/ports/teams.service.port";

@Injectable()
export class TeamsGatewayService extends AbstractTeamsGatewayService {
  constructor(private readonly teamsService: AbstractTeamsService) {
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
    },
  ): Promise<TeamResponse> {
    return this.teamsService.createTeam({
      ...body,
      organizationId: currentUser.organizationId,
    } as CreateTeamBody);
  }

  async listTeams(currentUser: AuthUser): Promise<TeamResponse[]> {
    return this.teamsService.listTeams(currentUser.organizationId);
  }

  async getTeam(currentUser: AuthUser, teamId: string): Promise<TeamResponse> {
    return this.teamsService.getTeam(currentUser.organizationId, teamId);
  }

  async updateTeam(
    currentUser: AuthUser,
    teamId: string,
    body: UpdateTeamBody,
  ): Promise<TeamResponse> {
    return this.teamsService.updateTeam(currentUser.organizationId, teamId, body);
  }

  async deleteTeam(currentUser: AuthUser, teamId: string): Promise<{ deleted: true }> {
    return this.teamsService.deleteTeam(currentUser.organizationId, teamId);
  }

  async addMember(
    currentUser: AuthUser,
    teamId: string,
    technicianId: string,
  ): Promise<TeamResponse> {
    return this.teamsService.addMember(currentUser.organizationId, teamId, technicianId);
  }

  async removeMember(
    currentUser: AuthUser,
    teamId: string,
    technicianId: string,
  ): Promise<TeamResponse> {
    return this.teamsService.removeMember(currentUser.organizationId, teamId, technicianId);
  }
}
