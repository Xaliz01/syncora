import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
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
  EmailVerificationRequiredResponse,
  VerifyEmailBody,
  ResendEmailVerificationBody,
  ResendEmailVerificationResponse,
  ForgotPasswordBody,
  ForgotPasswordResponse,
  ResetPasswordBody,
  ResetPasswordResponse,
  ResolveInvitationPreviewResponse,
} from "@planwise/shared";
import { isOnboardingJwtPayload } from "@planwise/shared";

type CreateOrgRequest = Request & {
  user?: JwtPayload;
  onboardingUser?: OnboardingJwtPayload;
};

function requestUserAgent(req: Request): string | undefined {
  const ua = req.headers["user-agent"];
  return typeof ua === "string" ? ua : undefined;
}

function optionalAuthenticatedUserId(req: Request, jwtService: JwtService): string | undefined {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return undefined;
  try {
    const payload = jwtService.verify<JwtPayload | OnboardingJwtPayload>(authHeader.slice(7));
    if (isOnboardingJwtPayload(payload)) return undefined;
    return payload.sub?.trim() || undefined;
  } catch {
    return undefined;
  }
}

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AbstractAuthService,
    private readonly jwtService: JwtService,
  ) {}

  /** @deprecated Préférer register-account puis create-organization. */
  @Post("register")
  async register(@Body() body: RegisterBody, @Req() req: Request): Promise<AuthResponse> {
    return this.authService.register(body, { userAgent: requestUserAgent(req) });
  }

  @Post("register-account")
  async registerAccount(
    @Body() body: RegisterAccountBody,
  ): Promise<EmailVerificationRequiredResponse> {
    return this.authService.registerAccount(body);
  }

  @Post("verify-email")
  async verifyEmail(@Body() body: VerifyEmailBody): Promise<OnboardingAuthResponse> {
    return this.authService.verifyEmail(body);
  }

  @Post("resend-email-verification")
  async resendEmailVerification(
    @Body() body: ResendEmailVerificationBody,
  ): Promise<ResendEmailVerificationResponse> {
    return this.authService.resendEmailVerification(body);
  }

  @Post("forgot-password")
  async forgotPassword(@Body() body: ForgotPasswordBody): Promise<ForgotPasswordResponse> {
    return this.authService.forgotPassword(body);
  }

  @Post("reset-password")
  async resetPassword(@Body() body: ResetPasswordBody): Promise<ResetPasswordResponse> {
    return this.authService.resetPassword(body);
  }

  @Post("login")
  async login(
    @Body() body: LoginBody,
    @Req() req: Request,
  ): Promise<AuthResponse | OnboardingAuthResponse> {
    return this.authService.login(body, { userAgent: requestUserAgent(req) });
  }

  @Post("accept-invitation")
  async acceptInvitation(
    @Body() body: AcceptInvitationBody,
    @Req() req: Request,
  ): Promise<AuthResponse> {
    return this.authService.acceptInvitation(body, {
      userAgent: requestUserAgent(req),
      authenticatedUserId: optionalAuthenticatedUserId(req, this.jwtService),
    });
  }

  @Post("resolve-invitation")
  async resolveInvitation(
    @Body() body: { invitationToken?: string },
  ): Promise<ResolveInvitationPreviewResponse> {
    return this.authService.resolveInvitation(body.invitationToken ?? "");
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
    return this.authService.createOrganization(body, actor, {
      userAgent: requestUserAgent(req),
    });
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

  @Post("logout")
  @UseGuards(JwtAuthGuard)
  async logout(@Req() req: Request & { user: JwtPayload }): Promise<{ ok: true }> {
    return this.authService.logout(req.user);
  }

  @Get("onboarding/me")
  @UseGuards(OnboardingAuthGuard)
  async onboardingMe(
    @Req() req: Request & { onboardingUser: OnboardingJwtPayload },
  ): Promise<OnboardingUser> {
    return this.authService.getOnboardingUser(req.onboardingUser);
  }
}
