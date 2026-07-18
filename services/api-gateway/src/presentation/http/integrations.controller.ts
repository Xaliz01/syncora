import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import type { AuthUser } from "@planwise/shared";
import { CurrentUser } from "../../infrastructure/current-user.decorator";
import {
  RequirePermissionGuard,
  RequirePermissions,
} from "../../infrastructure/require-permission.guard";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import { SubscriptionAccessGuard } from "../../infrastructure/subscription-access.guard";
import { AbstractIntegrationsGatewayService } from "../../domain/ports/integrations.service.port";

@Controller("integrations")
@UseGuards(JwtAuthGuard, SubscriptionAccessGuard, RequirePermissionGuard)
export class IntegrationsController {
  constructor(private readonly integrationsService: AbstractIntegrationsGatewayService) {}

  @Get("pennylane")
  @RequirePermissions("integrations.pennylane.read")
  getPennylaneStatus(@CurrentUser() user: AuthUser) {
    return this.integrationsService.getPennylaneStatus(user);
  }

  @Post("pennylane/oauth/start")
  @RequirePermissions("integrations.pennylane.configure")
  startOAuth(@CurrentUser() user: AuthUser) {
    return this.integrationsService.startPennylaneOAuth(user);
  }

  @Post("pennylane/oauth/complete")
  @RequirePermissions("integrations.pennylane.configure")
  completeOAuth(@CurrentUser() user: AuthUser, @Body() body: { code?: string; state?: string }) {
    return this.integrationsService.completePennylaneOAuth(user, {
      code: body.code ?? "",
      state: body.state ?? "",
    });
  }

  @Post("pennylane/connect")
  @RequirePermissions("integrations.pennylane.configure")
  connectPennylane(@CurrentUser() user: AuthUser, @Body() body: { apiToken?: string }) {
    return this.integrationsService.connectPennylane(user, {
      apiToken: body.apiToken ?? "",
    });
  }

  @Delete("pennylane")
  @RequirePermissions("integrations.pennylane.configure")
  disconnectPennylane(@CurrentUser() user: AuthUser) {
    return this.integrationsService.disconnectPennylane(user);
  }

  @Post("pennylane/cases/:caseId/sync")
  @RequirePermissions("integrations.pennylane.sync")
  syncCase(
    @CurrentUser() user: AuthUser,
    @Param("caseId") caseId: string,
    @Body() body?: { quoteId?: string },
    @Query("quoteId") quoteIdQuery?: string,
  ) {
    return this.integrationsService.syncCaseToPennylane(user, caseId, {
      quoteId: body?.quoteId || quoteIdQuery,
    });
  }
}
