import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { AuthService } from "../../domain/auth.service";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import { CurrentUser } from "../../infrastructure/current-user.decorator";
import type {
  AcceptInvitationBody,
  AuthUser,
  RegisterBody,
  LoginBody,
  AuthResponse
} from "@syncora/shared";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
