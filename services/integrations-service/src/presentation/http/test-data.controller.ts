import { Controller, Delete, Query } from "@nestjs/common";
import { parseOrganizationIdQuery } from "@planwise/shared/nest";
import { AbstractIntegrationsService } from "../../domain/ports/integrations.service.port";

@Controller("test-data")
export class TestDataController {
  constructor(private readonly integrationsService: AbstractIntegrationsService) {}

  @Delete()
  async purge(@Query("organizationId") organizationId: string) {
    await this.integrationsService.purgeTestData(parseOrganizationIdQuery(organizationId));
    return { purged: true };
  }
}
