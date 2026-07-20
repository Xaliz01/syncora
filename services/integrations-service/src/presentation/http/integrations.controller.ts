import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { parseOrganizationIdBody, parseOrganizationIdQuery } from "@planwise/shared/nest";
import type {
  CompletePennylaneOAuthBody,
  CompleteQontoOAuthBody,
  ConnectPennylaneBody,
  ConnectQontoBody,
  SyncCaseToPennylaneBody,
  SyncCaseToQontoBody,
} from "@planwise/shared";
import { AbstractIntegrationsService } from "../../domain/ports/integrations.service.port";

@Controller()
export class IntegrationsController {
  constructor(private readonly integrationsService: AbstractIntegrationsService) {}

  @Get("integrations/pennylane")
  getPennylaneStatus(@Query("organizationId") organizationId: string) {
    return this.integrationsService.getPennylaneStatus(parseOrganizationIdQuery(organizationId));
  }

  @Post("integrations/pennylane/oauth/start")
  startOAuth(@Body() body: { organizationId?: string }) {
    return this.integrationsService.startPennylaneOAuth(
      parseOrganizationIdBody(body.organizationId),
    );
  }

  @Post("integrations/pennylane/oauth/complete")
  completeOAuth(@Body() body: CompletePennylaneOAuthBody) {
    const organizationId = parseOrganizationIdBody(body.organizationId);
    return this.integrationsService.completePennylaneOAuth({ ...body, organizationId });
  }

  @Post("integrations/pennylane/connect")
  connectPennylane(@Body() body: ConnectPennylaneBody) {
    const organizationId = parseOrganizationIdBody(body.organizationId);
    return this.integrationsService.connectPennylane({ ...body, organizationId });
  }

  @Delete("integrations/pennylane")
  disconnectPennylane(@Query("organizationId") organizationId: string) {
    return this.integrationsService.disconnectPennylane(parseOrganizationIdQuery(organizationId));
  }

  @Post("integrations/pennylane/sync-case")
  syncCase(@Body() body: SyncCaseToPennylaneBody) {
    const organizationId = parseOrganizationIdBody(body.organizationId);
    return this.integrationsService.syncCaseToPennylane({ ...body, organizationId });
  }

  /** Alias REST pour tests / clarté. */
  @Post("integrations/pennylane/cases/:caseId/sync")
  syncCaseByParam(
    @Param("caseId") caseId: string,
    @Body() body: Omit<SyncCaseToPennylaneBody, "caseId"> & { caseId?: string },
  ) {
    const organizationId = parseOrganizationIdBody(body.organizationId);
    return this.integrationsService.syncCaseToPennylane({
      ...body,
      organizationId,
      caseId,
    });
  }

  // ── Qonto ──

  @Get("integrations/qonto")
  getQontoStatus(@Query("organizationId") organizationId: string) {
    return this.integrationsService.getQontoStatus(parseOrganizationIdQuery(organizationId));
  }

  @Post("integrations/qonto/oauth/start")
  startQontoOAuth(@Body() body: { organizationId?: string }) {
    return this.integrationsService.startQontoOAuth(parseOrganizationIdBody(body.organizationId));
  }

  @Post("integrations/qonto/oauth/complete")
  completeQontoOAuth(@Body() body: CompleteQontoOAuthBody) {
    const organizationId = parseOrganizationIdBody(body.organizationId);
    return this.integrationsService.completeQontoOAuth({ ...body, organizationId });
  }

  @Post("integrations/qonto/connect")
  connectQonto(@Body() body: ConnectQontoBody) {
    const organizationId = parseOrganizationIdBody(body.organizationId);
    return this.integrationsService.connectQonto({ ...body, organizationId });
  }

  @Delete("integrations/qonto")
  disconnectQonto(@Query("organizationId") organizationId: string) {
    return this.integrationsService.disconnectQonto(parseOrganizationIdQuery(organizationId));
  }

  @Post("integrations/qonto/sync-case")
  syncCaseToQonto(@Body() body: SyncCaseToQontoBody) {
    const organizationId = parseOrganizationIdBody(body.organizationId);
    return this.integrationsService.syncCaseToQonto({ ...body, organizationId });
  }

  @Post("integrations/qonto/cases/:caseId/sync")
  syncCaseToQontoByParam(
    @Param("caseId") caseId: string,
    @Body() body: Omit<SyncCaseToQontoBody, "caseId"> & { caseId?: string },
  ) {
    const organizationId = parseOrganizationIdBody(body.organizationId);
    return this.integrationsService.syncCaseToQonto({
      ...body,
      organizationId,
      caseId,
    });
  }

  @Get("integrations/cases/:caseId/invoice-sync")
  getCaseInvoiceSync(
    @Param("caseId") caseId: string,
    @Query("organizationId") organizationId: string,
  ) {
    return this.integrationsService.getCaseInvoiceSync(
      parseOrganizationIdQuery(organizationId),
      caseId,
    );
  }

  /** Doit rester avant les routes `:syncId` pour ne pas capturer `refresh` comme id. */
  @Post("integrations/cases/:caseId/invoice-sync/refresh")
  refreshAllCaseInvoiceSyncs(
    @Param("caseId") caseId: string,
    @Body() body: { organizationId?: string },
  ) {
    return this.integrationsService.refreshAllCaseInvoiceSyncs(
      parseOrganizationIdBody(body.organizationId),
      caseId,
    );
  }

  @Post("integrations/cases/:caseId/invoice-sync/:syncId/finalize")
  finalizeCaseInvoice(
    @Param("caseId") caseId: string,
    @Param("syncId") syncId: string,
    @Body() body: { organizationId?: string },
  ) {
    return this.integrationsService.finalizeCaseInvoice(
      parseOrganizationIdBody(body.organizationId),
      caseId,
      syncId,
    );
  }

  @Post("integrations/cases/:caseId/invoice-sync/:syncId/refresh")
  refreshCaseInvoiceSync(
    @Param("caseId") caseId: string,
    @Param("syncId") syncId: string,
    @Body() body: { organizationId?: string },
  ) {
    return this.integrationsService.refreshCaseInvoiceSync(
      parseOrganizationIdBody(body.organizationId),
      caseId,
      syncId,
    );
  }

  @Delete("integrations/cases/:caseId/invoice-sync/:syncId")
  deleteCaseInvoiceSync(
    @Param("caseId") caseId: string,
    @Param("syncId") syncId: string,
    @Query("organizationId") organizationId: string,
  ) {
    return this.integrationsService.deleteCaseInvoiceSync(
      parseOrganizationIdQuery(organizationId),
      caseId,
      syncId,
    );
  }

  /** Appelé par le cron interne (pas exposé via la gateway publique). */
  @Post("integrations/invoice-syncs/refresh-pending")
  refreshPendingInvoiceSyncs() {
    return this.integrationsService.refreshPendingInvoiceSyncs();
  }
}
