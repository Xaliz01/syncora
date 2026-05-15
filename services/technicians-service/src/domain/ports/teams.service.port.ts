import type { CreateTeamBody, UpdateTeamBody, TeamResponse } from "@syncora/shared";

export abstract class AbstractTeamsService {
  abstract createTeam(body: CreateTeamBody): Promise<TeamResponse>;
  abstract updateTeam(
    organizationId: string,
    teamId: string,
    body: UpdateTeamBody,
  ): Promise<TeamResponse>;
  abstract getTeam(organizationId: string, teamId: string): Promise<TeamResponse>;
  abstract listTeams(organizationId: string): Promise<TeamResponse[]>;
  abstract deleteTeam(organizationId: string, teamId: string): Promise<{ deleted: true }>;
  abstract addMember(
    organizationId: string,
    teamId: string,
    technicianId: string,
  ): Promise<TeamResponse>;
  abstract removeMember(
    organizationId: string,
    teamId: string,
    technicianId: string,
  ): Promise<TeamResponse>;
}
