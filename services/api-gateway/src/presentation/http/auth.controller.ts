import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { AbstractAuthService } from "../../domain/ports/auth.service.port";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import type {
  AcceptInvitationBody,
  AuthUser,
  RegisterBody,
  LoginBody,
  AuthResponse,
  JwtPayload,
  CreateOrganizationBody,
  SwitchOrganizationBody,
} from "@syncora/shared";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AbstractAuthService) {}

  @Post("register")
  async register(@Body() body: RegisterBody): Promise<AuthResponse> {
    return this.authService.register(body);
  }

  @Post("login")
  async login(@Body() body: LoginBody): Promise<AuthResponse> {
    return this.authService.login(body);
  }

  @Post("accept-invitation")
  async acceptInvitation(@Body() body: AcceptInvitationBody): Promise<AuthResponse> {
    return this.authService.acceptInvitation(body);
  }

  @Post("create-organization")
  @UseGuards(JwtAuthGuard)
  async createOrganization(
    @Body() body: CreateOrganizationBody,
    @Req() req: Request & { user: JwtPayload },
  ): Promise<AuthResponse> {
    return this.authService.createOrganization(body, req.user);
  }

  @Post("switch-organization")
  @UseGuards(JwtAuthGuard)
  async switchOrganization(
    @Body() body: SwitchOrganizationBody,
    @Req() req: Request & { user: JwtPayload },
  ): Promise<AuthResponse> {
    return this.authService.switchOrganization(body, req.user);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request & { user: JwtPayload }): Promise<AuthUser> {
    return this.authService.getSessionUser(req.user);
  }
}
