import { Body, Controller, Get, HttpCode, HttpStatus, Put, Post, UseGuards } from "@nestjs/common";
import { AbstractAccountService } from "../../domain/ports/account.service.port";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import { CurrentUser } from "../../infrastructure/current-user.decorator";
import type {
  AuthUser,
  ChangePasswordBody,
  UpdateUserNameBody,
  UpdateUserPreferencesBody,
} from "@syncora/shared";

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
}
