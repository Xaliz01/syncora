import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import type { AuthUser } from "@planwise/shared";
import { CurrentUser } from "../../infrastructure/current-user.decorator";
import {
  RequireAnyPermissions,
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
    @Body()
    body?: {
      quoteId?: string;
      invoiceKind?: string;
      situationPercent?: number;
      amountHt?: number;
    },
    @Query("quoteId") quoteIdQuery?: string,
  ) {
    const quoteId = (body?.quoteId || quoteIdQuery || "").trim();
    return this.integrationsService.syncCaseToPennylane(user, caseId, {
      quoteId,
      invoiceKind: body?.invoiceKind as "full" | "situation" | "deposit" | "balance" | undefined,
      situationPercent: body?.situationPercent,
      amountHt: body?.amountHt,
    });
  }

  // ── Qonto ──

  @Get("qonto")
  @RequirePermissions("integrations.qonto.read")
  getQontoStatus(@CurrentUser() user: AuthUser) {
    return this.integrationsService.getQontoStatus(user);
  }

  @Post("qonto/oauth/start")
  @RequirePermissions("integrations.qonto.configure")
  startQontoOAuth(@CurrentUser() user: AuthUser) {
    return this.integrationsService.startQontoOAuth(user);
  }

  @Post("qonto/oauth/complete")
  @RequirePermissions("integrations.qonto.configure")
  completeQontoOAuth(
    @CurrentUser() user: AuthUser,
    @Body() body: { code?: string; state?: string },
  ) {
    return this.integrationsService.completeQontoOAuth(user, {
      code: body.code ?? "",
      state: body.state ?? "",
    });
  }

  @Post("qonto/connect")
  @RequirePermissions("integrations.qonto.configure")
  connectQonto(
    @CurrentUser() user: AuthUser,
    @Body() body: { login?: string; secretKey?: string },
  ) {
    return this.integrationsService.connectQonto(user, {
      login: body.login ?? "",
      secretKey: body.secretKey ?? "",
    });
  }

  @Delete("qonto")
  @RequirePermissions("integrations.qonto.configure")
  disconnectQonto(@CurrentUser() user: AuthUser) {
    return this.integrationsService.disconnectQonto(user);
  }

  @Post("qonto/cases/:caseId/sync")
  @RequirePermissions("integrations.qonto.sync")
  syncCaseToQonto(
    @CurrentUser() user: AuthUser,
    @Param("caseId") caseId: string,
    @Body()
    body?: {
      quoteId?: string;
      invoiceNumber?: string;
      invoiceKind?: string;
      situationPercent?: number;
      amountHt?: number;
    },
    @Query("quoteId") quoteIdQuery?: string,
  ) {
    return this.integrationsService.syncCaseToQonto(user, caseId, {
      quoteId: (body?.quoteId || quoteIdQuery || "").trim(),
      invoiceNumber: body?.invoiceNumber,
      invoiceKind: body?.invoiceKind as "full" | "situation" | "deposit" | "balance" | undefined,
      situationPercent: body?.situationPercent,
      amountHt: body?.amountHt,
    });
  }

  @Get("cases/:caseId/invoice-sync")
  @RequireAnyPermissions("integrations.pennylane.read", "integrations.qonto.read")
  getCaseInvoiceSync(@CurrentUser() user: AuthUser, @Param("caseId") caseId: string) {
    return this.integrationsService.getCaseInvoiceSync(user, caseId);
  }

  /** Avant `:syncId` pour ne pas traiter `refresh` comme un identifiant. */
  @Post("cases/:caseId/invoice-sync/refresh")
  @RequireAnyPermissions("integrations.pennylane.sync", "integrations.qonto.sync")
  refreshAllCaseInvoiceSyncs(@CurrentUser() user: AuthUser, @Param("caseId") caseId: string) {
    return this.integrationsService.refreshAllCaseInvoiceSyncs(user, caseId);
  }

  @Post("cases/:caseId/invoice-sync/:syncId/finalize")
  @RequireAnyPermissions("integrations.pennylane.sync", "integrations.qonto.sync")
  finalizeCaseInvoice(
    @CurrentUser() user: AuthUser,
    @Param("caseId") caseId: string,
    @Param("syncId") syncId: string,
  ) {
    return this.integrationsService.finalizeCaseInvoice(user, caseId, syncId);
  }

  @Post("cases/:caseId/invoice-sync/:syncId/refresh")
  @RequireAnyPermissions("integrations.pennylane.sync", "integrations.qonto.sync")
  refreshCaseInvoiceSync(
    @CurrentUser() user: AuthUser,
    @Param("caseId") caseId: string,
    @Param("syncId") syncId: string,
  ) {
    return this.integrationsService.refreshCaseInvoiceSync(user, caseId, syncId);
  }

  @Delete("cases/:caseId/invoice-sync/:syncId")
  @RequireAnyPermissions("integrations.pennylane.sync", "integrations.qonto.sync")
  deleteCaseInvoiceSync(
    @CurrentUser() user: AuthUser,
    @Param("caseId") caseId: string,
    @Param("syncId") syncId: string,
  ) {
    return this.integrationsService.deleteCaseInvoiceSync(user, caseId, syncId);
  }
}
