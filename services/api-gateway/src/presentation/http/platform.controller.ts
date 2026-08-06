import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { AbstractPlatformService } from "../../domain/ports/platform.service.port";
import {
  CurrentPlatformUser,
  PlatformJwtAuthGuard,
} from "../../infrastructure/platform-jwt-auth.guard";
import type {
  LoginBody,
  PlatformAuthUser,
  PlatformProspectEmailNotFoundBody,
  PlatformProspectNoteBody,
  PlatformProspectOutreachBody,
  StartImpersonationBody,
} from "@planwise/shared";

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

  @Post("organizations/:organizationId/extend-trial")
  @UseGuards(PlatformJwtAuthGuard)
  staffExtendTrial(@Param("organizationId") organizationId: string) {
    return this.platformService.staffExtendOrganizationTrial(organizationId);
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

  @Get("analytics/overview")
  @UseGuards(PlatformJwtAuthGuard)
  getAnalyticsOverview(@Query("days") days?: string) {
    return this.platformService.getAnalyticsOverview(days ? Number.parseInt(days, 10) : undefined);
  }

  @Get("analytics/landing-visits")
  @UseGuards(PlatformJwtAuthGuard)
  listLandingVisits(
    @Query("days") days?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.platformService.listLandingVisits({
      days: days ? Number.parseInt(days, 10) : undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
      offset: offset ? Number.parseInt(offset, 10) : undefined,
    });
  }

  @Get("prospects")
  @UseGuards(PlatformJwtAuthGuard)
  searchProspects(
    @Query("page") page?: string,
    @Query("perPage") perPage?: string,
    @Query("departement") departement?: string,
    @Query("codeNaf") codeNaf?: string,
    @Query("preset") preset?: string,
  ) {
    return this.platformService.searchProspects({
      page: page ? Number.parseInt(page, 10) : undefined,
      perPage: perPage ? Number.parseInt(perPage, 10) : undefined,
      departement,
      codeNaf,
      preset,
    });
  }

  @Get("prospects/credits")
  @UseGuards(PlatformJwtAuthGuard)
  getProspectCredits() {
    return this.platformService.getProspectCredits();
  }

  @Get("prospects/tracked")
  @UseGuards(PlatformJwtAuthGuard)
  listTrackedProspects(@Query("limit") limit?: string, @Query("offset") offset?: string) {
    return this.platformService.listTrackedProspects({
      limit: limit ? Number.parseInt(limit, 10) : undefined,
      offset: offset ? Number.parseInt(offset, 10) : undefined,
    });
  }

  @Post("prospects/outreach")
  @UseGuards(PlatformJwtAuthGuard)
  sendProspectOutreach(
    @CurrentPlatformUser() user: PlatformAuthUser,
    @Body() body: PlatformProspectOutreachBody,
  ) {
    return this.platformService.sendProspectOutreach(user, body);
  }

  @Post("prospects/email-not-found")
  @UseGuards(PlatformJwtAuthGuard)
  markProspectEmailNotFound(
    @CurrentPlatformUser() user: PlatformAuthUser,
    @Body() body: PlatformProspectEmailNotFoundBody,
  ) {
    return this.platformService.markProspectEmailNotFound(user, body);
  }

  @Post("prospects/note")
  @UseGuards(PlatformJwtAuthGuard)
  saveProspectNote(
    @CurrentPlatformUser() user: PlatformAuthUser,
    @Body() body: PlatformProspectNoteBody,
  ) {
    return this.platformService.saveProspectNote(user, body);
  }
}
