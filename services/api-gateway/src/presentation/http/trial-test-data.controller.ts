import { Controller, Delete, Get, Post, UseGuards } from "@nestjs/common";
import { AdminRoleGuard } from "../../infrastructure/admin-role.guard";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import { CurrentUser } from "../../infrastructure/current-user.decorator";
import type { AuthUser } from "@syncora/shared";
import { AbstractTrialTestDataService } from "../../domain/ports/trial-test-data.service.port";

@Controller("trial-test-data")
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class TrialTestDataController {
  constructor(private readonly trialTestDataService: AbstractTrialTestDataService) {}

  @Get("status")
  getStatus(@CurrentUser() user: AuthUser) {
    return this.trialTestDataService.getStatus(user);
  }

  @Post("inject")
  inject(@CurrentUser() user: AuthUser) {
    return this.trialTestDataService.inject(user);
  }

  @Delete()
  purge(@CurrentUser() user: AuthUser) {
    return this.trialTestDataService.purge(user);
  }
}
