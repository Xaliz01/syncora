import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards
} from "@nestjs/common";
import { AbstractTeamsGatewayService } from "../../domain/ports/teams.service.port";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import { RequirePermissionGuard, RequirePermissions } from "../../infrastructure/require-permission.guard";
import { CurrentUser } from "../../infrastructure/current-user.decorator";
import type { AuthUser } from "@syncora/shared";
import type { UpdateTeamBody, TeamStatus } from "@syncora/shared";

interface CreateTeamPayload {
  name: string;
  agenceId?: string;
  technicianIds?: string[];
  status?: TeamStatus;
  calendarColor?: string;
}

@Controller("fleet/teams")
@UseGuards(JwtAuthGuard, RequirePermissionGuard)
export class TeamsGatewayController {
  constructor(private readonly teamsService: AbstractTeamsGatewayService) {}

  @Post()
  @RequirePermissions("teams.create")
  async createTeam(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateTeamPayload
  ) {
    return this.teamsService.createTeam(user, body);
  }

  @Get()
  @RequirePermissions("teams.read")
  async listTeams(@CurrentUser() user: AuthUser) {
    return this.teamsService.listTeams(user);
  }

  @Get(":teamId")
  @RequirePermissions("teams.read")
  async getTeam(
    @CurrentUser() user: AuthUser,
    @Param("teamId") teamId: string
  ) {
    return this.teamsService.getTeam(user, teamId);
  }

  @Patch(":teamId")
  @RequirePermissions("teams.update")
  async updateTeam(
    @CurrentUser() user: AuthUser,
    @Param("teamId") teamId: string,
    @Body() body: UpdateTeamBody
  ) {
    return this.teamsService.updateTeam(user, teamId, body);
  }

  @Delete(":teamId")
  @RequirePermissions("teams.delete")
  async deleteTeam(
    @CurrentUser() user: AuthUser,
    @Param("teamId") teamId: string
  ) {
    return this.teamsService.deleteTeam(user, teamId);
  }

  @Put(":teamId/members/:technicianId")
  @RequirePermissions("teams.update")
  async addMember(
    @CurrentUser() user: AuthUser,
    @Param("teamId") teamId: string,
    @Param("technicianId") technicianId: string
  ) {
    return this.teamsService.addMember(user, teamId, technicianId);
  }

  @Delete(":teamId/members/:technicianId")
  @RequirePermissions("teams.update")
  async removeMember(
    @CurrentUser() user: AuthUser,
    @Param("teamId") teamId: string,
    @Param("technicianId") technicianId: string
  ) {
    return this.teamsService.removeMember(user, teamId, technicianId);
  }
}
