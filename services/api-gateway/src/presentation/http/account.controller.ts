import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { AbstractAccountService } from "../../domain/ports/account.service.port";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import { CurrentUser } from "../../infrastructure/current-user.decorator";
import type {
  AuthUser,
  ChangePasswordBody,
  CompleteOnboardingProfileBody,
  JwtPayload,
  UpdateUserNameBody,
  UpdateUserPreferencesBody,
} from "@planwise/shared";

@Controller("account")
@UseGuards(JwtAuthGuard)
export class AccountController {
  constructor(private readonly accountService: AbstractAccountService) {}

  @Put("name")
  async updateName(@CurrentUser() user: AuthUser, @Body() body: UpdateUserNameBody) {
    return this.accountService.updateName(user, body);
  }

  @Post("change-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(@CurrentUser() user: AuthUser, @Body() body: ChangePasswordBody) {
    await this.accountService.changePassword(user, body);
  }

  @Get("preferences")
  async getPreferences(@CurrentUser() user: AuthUser) {
    return this.accountService.getPreferences(user);
  }

  @Put("preferences")
  async updatePreferences(@CurrentUser() user: AuthUser, @Body() body: UpdateUserPreferencesBody) {
    return this.accountService.updatePreferences(user, body);
  }

  @Post("onboarding-profile")
  async completeOnboardingProfile(
    @CurrentUser() user: AuthUser,
    @Body() body: CompleteOnboardingProfileBody,
  ) {
    return this.accountService.completeOnboardingProfile(user, body);
  }

  @Get("support/crisp-identity")
  async getCrispIdentity(@CurrentUser() user: AuthUser) {
    return this.accountService.getCrispIdentity(user);
  }

  @Get("sessions")
  async listSessions(@CurrentUser() user: AuthUser, @Req() req: Request & { user: JwtPayload }) {
    return this.accountService.listSessions(user.id, req.user.sid);
  }

  @Delete("sessions/:sessionId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeSession(@CurrentUser() user: AuthUser, @Param("sessionId") sessionId: string) {
    if (!sessionId?.trim()) {
      throw new BadRequestException("sessionId is required");
    }
    await this.accountService.revokeSession(user.id, sessionId.trim());
  }

  @Post("sessions/revoke-others")
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeOtherSessions(
    @CurrentUser() user: AuthUser,
    @Req() req: Request & { user: JwtPayload },
  ) {
    const keepSessionId = req.user.sid?.trim();
    if (!keepSessionId) {
      throw new BadRequestException("Session courante introuvable");
    }
    await this.accountService.revokeOtherSessions(user.id, keepSessionId);
  }
}
