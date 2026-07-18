import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { parseOrganizationIdBody, parseOrganizationIdQuery } from "@planwise/shared/nest";
import type {
  CompletePennylaneOAuthBody,
  ConnectPennylaneBody,
  SyncCaseToPennylaneBody,
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
}
