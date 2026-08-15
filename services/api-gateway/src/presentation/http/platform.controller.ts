import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AbstractPlatformService } from "../../domain/ports/platform.service.port";
import {
  CurrentPlatformUser,
  PlatformJwtAuthGuard,
} from "../../infrastructure/platform-jwt-auth.guard";
import type {
  CreatePlatformEmailTemplateBody,
  LoginBody,
  PlatformAuthUser,
  PlatformEmailTemplatePreviewBody,
  PlatformProspectEmailNotFoundBody,
  PlatformProspectManualCreateBody,
  PlatformProspectNoteBody,
  PlatformProspectOutreachBody,
  PlatformSendUserEmailBody,
  StartImpersonationBody,
  UpdatePlatformEmailTemplateBody,
} from "@planwise/shared";
import { isPlatformEmailTemplatePurpose } from "@planwise/shared";

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
    @Query("includeTestAccounts") includeTestAccounts?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.platformService.listOrganizations({
      search,
      includeTestAccounts: includeTestAccounts === "true" || includeTestAccounts === "1",
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
    @Query("activeOnly") activeOnly?: string,
    @Query("includeTestAccounts") includeTestAccounts?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.platformService.listUsers({
      search,
      organizationId,
      activeOnly: activeOnly === "true" || activeOnly === "1",
      includeTestAccounts: includeTestAccounts === "true" || includeTestAccounts === "1",
      limit: limit ? Number.parseInt(limit, 10) : undefined,
      offset: offset ? Number.parseInt(offset, 10) : undefined,
    });
  }

  @Post("users/:userId/send-email")
  @UseGuards(PlatformJwtAuthGuard)
  sendUserEmail(
    @CurrentPlatformUser() user: PlatformAuthUser,
    @Param("userId") userId: string,
    @Body() body: PlatformSendUserEmailBody,
  ) {
    return this.platformService.sendUserEmail(user, userId, body);
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

  @Get("dashboard")
  @UseGuards(PlatformJwtAuthGuard)
  getDashboard() {
    return this.platformService.getDashboard();
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

  @Get("analytics/landing-to-app-visits")
  @UseGuards(PlatformJwtAuthGuard)
  listLandingToAppVisits(
    @Query("days") days?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.platformService.listLandingToAppVisits({
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
    @Query("sort") sort?: string,
    @Query("dateCreationMin") dateCreationMin?: string,
    @Query("refresh") refresh?: string,
  ) {
    return this.platformService.searchProspects({
      page: page ? Number.parseInt(page, 10) : undefined,
      perPage: perPage ? Number.parseInt(perPage, 10) : undefined,
      departement,
      codeNaf,
      preset,
      sort: sort === "created_at_desc" ? "created_at_desc" : "default",
      dateCreationMin,
      refresh: refresh === "1" || refresh === "true",
    });
  }

  @Get("prospects/by-siret")
  @UseGuards(PlatformJwtAuthGuard)
  lookupProspectBySiret(@Query("siret") siret?: string) {
    return this.platformService.lookupProspectBySiret(siret ?? "");
  }

  @Get("prospects/credits")
  @UseGuards(PlatformJwtAuthGuard)
  getProspectCredits() {
    return this.platformService.getProspectCredits();
  }

  @Get("prospects/tracked")
  @UseGuards(PlatformJwtAuthGuard)
  listTrackedProspects(
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Query("status") status?: string,
    @Query("search") search?: string,
  ) {
    const normalizedStatus =
      status === "sent" || status === "failed" || status === "email_not_found" || status === "noted"
        ? status
        : undefined;
    return this.platformService.listTrackedProspects({
      limit: limit ? Number.parseInt(limit, 10) : undefined,
      offset: offset ? Number.parseInt(offset, 10) : undefined,
      status: normalizedStatus,
      search: search?.trim() || undefined,
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

  @Get("email-templates")
  @UseGuards(PlatformJwtAuthGuard)
  listEmailTemplates(@Query("purpose") purpose?: string) {
    const normalized = purpose && isPlatformEmailTemplatePurpose(purpose) ? purpose : undefined;
    return this.platformService.listEmailTemplates(normalized);
  }

  @Post("email-templates")
  @UseGuards(PlatformJwtAuthGuard)
  createEmailTemplate(@Body() body: CreatePlatformEmailTemplateBody) {
    return this.platformService.createEmailTemplate(body);
  }

  @Post("email-templates/preview")
  @UseGuards(PlatformJwtAuthGuard)
  previewEmailTemplate(@Body() body: PlatformEmailTemplatePreviewBody) {
    return this.platformService.previewEmailTemplate(body);
  }

  @Get("email-templates/:id")
  @UseGuards(PlatformJwtAuthGuard)
  getEmailTemplate(@Param("id") id: string) {
    return this.platformService.getEmailTemplate(id);
  }

  @Patch("email-templates/:id")
  @UseGuards(PlatformJwtAuthGuard)
  updateEmailTemplate(@Param("id") id: string, @Body() body: UpdatePlatformEmailTemplateBody) {
    return this.platformService.updateEmailTemplate(id, body);
  }

  @Delete("email-templates/:id")
  @UseGuards(PlatformJwtAuthGuard)
  deleteEmailTemplate(@Param("id") id: string) {
    return this.platformService.deleteEmailTemplate(id);
  }

  @Post("email-templates/:id/set-default")
  @UseGuards(PlatformJwtAuthGuard)
  setDefaultEmailTemplate(@Param("id") id: string) {
    return this.platformService.setDefaultEmailTemplate(id);
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

  @Post("prospects/manual")
  @UseGuards(PlatformJwtAuthGuard)
  createManualProspect(
    @CurrentPlatformUser() user: PlatformAuthUser,
    @Body() body: PlatformProspectManualCreateBody,
  ) {
    return this.platformService.createManualProspect(user, body);
  }
}
