import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { AbstractPlatformService } from "../../domain/ports/platform.service.port";
import {
  CurrentPlatformUser,
  PlatformJwtAuthGuard,
} from "../../infrastructure/platform-jwt-auth.guard";
import type { LoginBody, PlatformAuthUser, StartImpersonationBody } from "@planwise/shared";

@Controller("platform")
export class PlatformController {
  constructor(private readonly platformService: AbstractPlatformService) {}

  @Post("login")
  login(@Body() body: LoginBody) {
    return this.platformService.login(body);
  }

  @Get("me")
  @UseGuards(PlatformJwtAuthGuard)
  me(@CurrentPlatformUser() user: PlatformAuthUser) {
    return this.platformService.getMe(user);
  }

  @Get("organizations")
  @UseGuards(PlatformJwtAuthGuard)
  listOrganizations(
    @Query("search") search?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.platformService.listOrganizations({
      search,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
      offset: offset ? Number.parseInt(offset, 10) : undefined,
    });
  }

  @Get("organizations/:organizationId")
  @UseGuards(PlatformJwtAuthGuard)
  getOrganization(@Param("organizationId") organizationId: string) {
    return this.platformService.getOrganization(organizationId);
  }

  @Get("users")
  @UseGuards(PlatformJwtAuthGuard)
  listUsers(
    @Query("search") search?: string,
    @Query("organizationId") organizationId?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.platformService.listUsers({
      search,
      organizationId,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
      offset: offset ? Number.parseInt(offset, 10) : undefined,
    });
  }

  @Post("impersonate")
  @UseGuards(PlatformJwtAuthGuard)
  impersonate(@CurrentPlatformUser() user: PlatformAuthUser, @Body() body: StartImpersonationBody) {
    return this.platformService.startImpersonation(user, body);
  }

  @Get("integrations")
  @UseGuards(PlatformJwtAuthGuard)
  listIntegrations(
    @Query("provider") provider?: string,
    @Query("organizationId") organizationId?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.platformService.listIntegrations({
      provider,
      organizationId,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
      offset: offset ? Number.parseInt(offset, 10) : undefined,
    });
  }

  @Get("cron-jobs")
  @UseGuards(PlatformJwtAuthGuard)
  getCronJobsOverview() {
    return this.platformService.getCronJobsOverview();
  }

  @Get("cron-runs")
  @UseGuards(PlatformJwtAuthGuard)
  listCronRuns(
    @Query("jobKey") jobKey?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.platformService.listCronRuns({
      jobKey,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
      offset: offset ? Number.parseInt(offset, 10) : undefined,
    });
  }
}
