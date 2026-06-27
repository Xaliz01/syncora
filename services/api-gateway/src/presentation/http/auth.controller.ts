import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { AbstractAuthService } from "../../domain/ports/auth.service.port";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import { OnboardingAuthGuard } from "../../infrastructure/onboarding-auth.guard";
import { CreateOrganizationGuard } from "../../infrastructure/create-organization.guard";
import type {
  AcceptInvitationBody,
  RegisterBody,
  RegisterAccountBody,
  LoginBody,
  AuthResponse,
  AuthUser,
  JwtPayload,
  OnboardingAuthResponse,
  OnboardingJwtPayload,
  OnboardingUser,
  CreateOrganizationBody,
  SwitchOrganizationBody,
} from "@syncora/shared";

type CreateOrgRequest = Request & {
  user?: JwtPayload;
  onboardingUser?: OnboardingJwtPayload;
};

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AbstractAuthService) {}

  /** @deprecated Préférer register-account puis create-organization. */
  @Post("register")
  async register(@Body() body: RegisterBody): Promise<AuthResponse> {
    return this.authService.register(body);
  }

  @Post("register-account")
  async registerAccount(@Body() body: RegisterAccountBody): Promise<OnboardingAuthResponse> {
    return this.authService.registerAccount(body);
  }

  @Post("login")
  async login(@Body() body: LoginBody): Promise<AuthResponse | OnboardingAuthResponse> {
    return this.authService.login(body);
  }

  @Post("accept-invitation")
  async acceptInvitation(@Body() body: AcceptInvitationBody): Promise<AuthResponse> {
    return this.authService.acceptInvitation(body);
  }

  @Post("create-organization")
  @UseGuards(CreateOrganizationGuard)
  async createOrganization(
    @Body() body: CreateOrganizationBody,
    @Req() req: CreateOrgRequest,
  ): Promise<AuthResponse> {
    const actor = req.onboardingUser ?? req.user;
    if (!actor) {
      throw new Error("CreateOrganizationGuard should set actor");
    }
    return this.authService.createOrganization(body, actor);
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

  @Get("onboarding/me")
  @UseGuards(OnboardingAuthGuard)
  async onboardingMe(
    @Req() req: Request & { onboardingUser: OnboardingJwtPayload },
  ): Promise<OnboardingUser> {
    return this.authService.getOnboardingUser(req.onboardingUser);
  }
}
