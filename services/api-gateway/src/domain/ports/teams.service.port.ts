import type { AuthUser, TeamResponse, UpdateTeamBody, TeamStatus } from "@syncora/shared";

export abstract class AbstractTeamsGatewayService {
  abstract createTeam(
    currentUser: AuthUser,
    body: {
      name: string;
      agenceId?: string;
      technicianIds?: string[];
      status?: TeamStatus;
      calendarColor?: string;
    },
  ): Promise<TeamResponse>;
  abstract listTeams(currentUser: AuthUser): Promise<TeamResponse[]>;
  abstract getTeam(currentUser: AuthUser, teamId: string): Promise<TeamResponse>;
  abstract updateTeam(
    currentUser: AuthUser,
    teamId: string,
    body: UpdateTeamBody,
  ): Promise<TeamResponse>;
  abstract deleteTeam(currentUser: AuthUser, teamId: string): Promise<{ deleted: true }>;
  abstract addMember(
    currentUser: AuthUser,
    teamId: string,
    technicianId: string,
  ): Promise<TeamResponse>;
  abstract removeMember(
    currentUser: AuthUser,
    teamId: string,
    technicianId: string,
  ): Promise<TeamResponse>;
}
