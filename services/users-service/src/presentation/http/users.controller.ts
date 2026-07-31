import {
  BadRequestException,
  Body,
  Controller,
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
import type {
  ActivateInvitedUserBody,
  ChangePasswordBody,
  CreateAccountBody,
  CreateInvitedUserBody,
  CreateOrganizationMembershipBody,
  CreateUserBody,
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
  constructor(private readonly usersService: AbstractUsersService) {}

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
    return this.usersService.validateSession(body.userId, body.sessionId);
  }

  @Post(":id/sessions")
  async createSession(@Param("id") id: string) {
    return this.usersService.createSession(id);
  }

  @Post(":id/sessions/revoke")
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeSession(@Param("id") id: string, @Body() body: { sessionId?: string }) {
    await this.usersService.revokeSession(id, body.sessionId);
  }

  @Get()
  async listByOrganization(@Query("organizationId") organizationId: string) {
    if (!organizationId) {
      throw new BadRequestException("organizationId query param is required");
    }
    return this.usersService.listByOrganization(organizationId);
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
    return this.usersService.createImpersonationAudit(body);
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
  async getPreferences(@Param("id") id: string) {
    return this.usersService.getPreferences(id);
  }

  @Put(":id/preferences")
  async updatePreferences(@Param("id") id: string, @Body() body: UpdateUserPreferencesBody) {
    return this.usersService.updatePreferences(id, body);
  }

  @Patch(":id")
  async patch(@Param("id") id: string, @Body() body: PatchUserBody) {
    return this.usersService.patch(id, body);
  }

  @Get(":id")
  async findById(@Param("id") id: string) {
    const user = await this.usersService.findById(id);
    if (!user) throw new NotFoundException("User not found");
    return user;
  }
}
