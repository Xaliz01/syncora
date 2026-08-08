import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UnauthorizedException,
} from "@nestjs/common";
import { AbstractUsersService } from "../../domain/ports/users.service.port";
import { AbstractUserSessionsService } from "../../domain/ports/user-sessions.service.port";
import { AbstractUserPreferencesService } from "../../domain/ports/user-preferences.service.port";
import { AbstractProspectOutreachService } from "../../domain/ports/prospect-outreach.service.port";
import { AbstractImpersonationAuditService } from "../../domain/ports/impersonation-audit.service.port";
import type {
  ActivateInvitedUserBody,
  ChangePasswordBody,
  CreateAccountBody,
  CreateInvitedUserBody,
  CreateOrganizationMembershipBody,
  CreateUserBody,
  CreateUserSessionBody,
  PatchUserBody,
  ResendEmailVerificationBody,
  UpdateUserNameBody,
  UpdateUserPreferencesBody,
  ValidateCredentialsBody,
  ValidateCredentialsResponse,
  VerifyEmailBody,
} from "@planwise/shared";

@Controller("users")
export class UsersController {
  constructor(
    private readonly usersService: AbstractUsersService,
    private readonly sessionsService: AbstractUserSessionsService,
    private readonly preferencesService: AbstractUserPreferencesService,
    private readonly prospectOutreachService: AbstractProspectOutreachService,
    private readonly impersonationAuditService: AbstractImpersonationAuditService,
  ) {}

  @Post("accounts")
  async createAccount(@Body() body: CreateAccountBody) {
    return this.usersService.createAccount(body);
  }

  @Post("accounts/verify-email")
  async verifyEmail(@Body() body: VerifyEmailBody) {
    if (!body.email?.trim() || !body.code?.trim()) {
      throw new BadRequestException("email and code are required");
    }
    return this.usersService.verifyEmail(body.email, body.code);
  }

  @Post("accounts/resend-email-verification")
  @HttpCode(HttpStatus.OK)
  async resendEmailVerification(@Body() body: ResendEmailVerificationBody) {
    if (!body.email?.trim()) {
      throw new BadRequestException("email is required");
    }
    return this.usersService.resendEmailVerification(body.email);
  }

  @Get("accounts/:id")
  async findAccountById(@Param("id") id: string) {
    const user = await this.usersService.findAccountById(id);
    if (!user) throw new NotFoundException("User not found");
    return user;
  }

  @Post()
  async create(@Body() body: CreateUserBody) {
    return this.usersService.create(body);
  }

  @Post("invite")
  async invite(@Body() body: CreateInvitedUserBody) {
    return this.usersService.invite(body);
  }

  @Post("validate-credentials")
  async validateCredentials(
    @Body() body: ValidateCredentialsBody,
  ): Promise<ValidateCredentialsResponse> {
    const result = await this.usersService.validateCredentials(body.email, body.password);
    if (!result) {
      throw new UnauthorizedException("Invalid email or password");
    }
    return result;
  }

  @Post("validate-session")
  @HttpCode(HttpStatus.OK)
  async validateSession(@Body() body: { userId?: string; sessionId?: string }) {
    if (!body.userId?.trim() || !body.sessionId?.trim()) {
      throw new BadRequestException("userId and sessionId are required");
    }
    return this.sessionsService.validateSession(body.userId, body.sessionId);
  }

  @Post(":id/sessions")
  async createSession(@Param("id") id: string, @Body() body?: CreateUserSessionBody) {
    return this.sessionsService.createSession(id, { userAgent: body?.userAgent });
  }

  @Get(":id/sessions")
  async listSessions(
    @Param("id") id: string,
    @Query("currentSessionId") currentSessionId?: string,
  ) {
    const sessions = await this.sessionsService.listSessions(id, currentSessionId);
    return { sessions };
  }

  @Post(":id/sessions/revoke")
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeSession(@Param("id") id: string, @Body() body: { sessionId?: string }) {
    await this.sessionsService.revokeSession(id, body.sessionId);
  }

  @Post(":id/sessions/revoke-others")
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeOtherSessions(@Param("id") id: string, @Body() body: { keepSessionId?: string }) {
    if (!body.keepSessionId?.trim()) {
      throw new BadRequestException("keepSessionId is required");
    }
    await this.sessionsService.revokeOtherSessions(id, body.keepSessionId);
  }

  @Delete(":id/sessions/:sessionId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSession(@Param("id") id: string, @Param("sessionId") sessionId: string) {
    await this.sessionsService.revokeSession(id, sessionId);
  }

  @Get()
  async listByOrganization(@Query("organizationId") organizationId: string) {
    if (!organizationId) {
      throw new BadRequestException("organizationId query param is required");
    }
    return this.usersService.listByOrganization(organizationId);
  }

  @Get("founding-admin")
  async getFoundingAdmin(@Query("organizationId") organizationId: string) {
    if (!organizationId?.trim()) {
      throw new BadRequestException("organizationId query param is required");
    }
    const userId = await this.usersService.findFoundingAdminUserId(organizationId);
    return { userId };
  }

  @Get("platform/directory")
  async listPlatformDirectory(
    @Query("search") search?: string,
    @Query("organizationId") organizationId?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.usersService.listPlatformDirectory({
      search,
      organizationId,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
      offset: offset ? Number.parseInt(offset, 10) : undefined,
    });
  }

  @Post("platform/organization-stats")
  async countUsersByOrganizationIds(@Body() body: { organizationIds?: string[] }) {
    return this.usersService.countUsersByOrganizationIds(body.organizationIds ?? []);
  }

  @Post("platform/impersonation-audits")
  async createImpersonationAudit(
    @Body()
    body: {
      impersonatorUserId: string;
      impersonatorEmail: string;
      targetUserId: string;
      targetEmail: string;
      organizationId: string;
      reason: string;
      expiresAt?: string;
    },
  ) {
    return this.impersonationAuditService.createImpersonationAudit(body);
  }

  @Get("platform/prospect-outreaches")
  async listProspectOutreaches(
    @Query("sirens") sirens?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Query("status") status?: string,
    @Query("search") search?: string,
  ) {
    if (sirens?.trim()) {
      const list = sirens
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return this.prospectOutreachService.listProspectOutreachesBySirens(list);
    }
    const normalizedStatus =
      status === "sent" || status === "failed" || status === "email_not_found" || status === "noted"
        ? status
        : undefined;
    return this.prospectOutreachService.listProspectOutreaches({
      limit: limit ? Number.parseInt(limit, 10) : undefined,
      offset: offset ? Number.parseInt(offset, 10) : undefined,
      status: normalizedStatus,
      search: search?.trim() || undefined,
    });
  }

  @Post("platform/prospect-outreaches")
  async createProspectOutreach(
    @Body()
    body: {
      siren: string;
      companyName: string;
      email: string;
      sentByUserId: string;
      sentByEmail: string;
      subject: string;
      status?: "sent" | "failed" | "email_not_found" | "noted";
      comment?: string;
    },
  ) {
    return this.prospectOutreachService.createProspectOutreach(body);
  }

  @Post("platform/prospect-outreaches/comment")
  async upsertProspectComment(
    @Body()
    body: {
      siren: string;
      companyName: string;
      comment: string;
      sentByUserId: string;
      sentByEmail: string;
    },
  ) {
    return this.prospectOutreachService.upsertProspectComment(body);
  }

  @Get(":userId/organization-memberships")
  listOrganizationMemberships(@Param("userId") userId: string) {
    return this.usersService.listOrganizationMemberships(userId);
  }

  @Post(":userId/organization-memberships")
  addOrganizationMembership(
    @Param("userId") userId: string,
    @Body() body: CreateOrganizationMembershipBody,
  ) {
    return this.usersService.addOrganizationMembership(userId, body);
  }

  @Post(":id/activate")
  async activateInvitedUser(@Param("id") id: string, @Body() body: ActivateInvitedUserBody) {
    return this.usersService.activateInvitedUser(id, body);
  }

  @Get(":id/invitation-activation-hints")
  async getInvitationActivationHints(@Param("id") id: string) {
    return this.usersService.getInvitationActivationHints(id);
  }

  @Patch(":id/invited-email")
  async updateInvitedUserEmail(
    @Param("id") id: string,
    @Body() body: { organizationId?: string; email?: string },
  ) {
    if (!body.organizationId?.trim() || !body.email?.trim()) {
      throw new BadRequestException("organizationId and email are required");
    }
    return this.usersService.updateInvitedUserEmail(id, body.organizationId, body.email);
  }

  @Post(":id/cancel-organization-invitation")
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelOrganizationInvitation(
    @Param("id") id: string,
    @Body() body: { organizationId?: string },
  ) {
    if (!body.organizationId?.trim()) {
      throw new BadRequestException("organizationId is required");
    }
    await this.usersService.cancelOrganizationInvitation(id, body.organizationId);
  }

  @Post(":id/deactivate-organization-membership")
  async deactivateOrganizationMembership(
    @Param("id") id: string,
    @Body() body: { organizationId?: string },
  ) {
    if (!body.organizationId?.trim()) {
      throw new BadRequestException("organizationId is required");
    }
    return this.usersService.deactivateOrganizationMembership(id, body.organizationId);
  }

  @Post(":id/reactivate-organization-membership")
  async reactivateOrganizationMembership(
    @Param("id") id: string,
    @Body() body: { organizationId?: string },
  ) {
    if (!body.organizationId?.trim()) {
      throw new BadRequestException("organizationId is required");
    }
    return this.usersService.reactivateOrganizationMembership(id, body.organizationId);
  }

  @Put(":id/name")
  async updateName(@Param("id") id: string, @Body() body: UpdateUserNameBody) {
    return this.usersService.updateName(id, body);
  }

  @Post(":id/change-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(@Param("id") id: string, @Body() body: ChangePasswordBody) {
    await this.usersService.changePassword(id, body);
  }

  @Get(":id/preferences")
  async getPreferences(@Param("id") id: string, @Query("organizationId") organizationId?: string) {
    return this.preferencesService.getPreferences(id, organizationId?.trim() || undefined);
  }

  @Put(":id/preferences")
  async updatePreferences(@Param("id") id: string, @Body() body: UpdateUserPreferencesBody) {
    return this.preferencesService.updatePreferences(id, body);
  }

  @Patch(":id")
  async patch(@Param("id") id: string, @Body() body: PatchUserBody) {
    return this.usersService.patch(id, body);
  }

  @Get(":id")
  async findById(@Param("id") id: string, @Query("organizationId") organizationId?: string) {
    const user = await this.usersService.findById(id, organizationId?.trim() || undefined);
    if (!user) throw new NotFoundException("User not found");
    return user;
  }
}
