import { Controller, Delete, Query } from "@nestjs/common";
import { parseOrganizationIdQuery } from "@syncora/shared/nest";
import { AbstractCasesService } from "../../domain/ports/cases.service.port";

@Controller("test-data")
export class TestDataController {
  constructor(private readonly casesService: AbstractCasesService) {}

  @Delete()
  purge(@Query("organizationId") organizationId: string) {
    return this.casesService.purgeTestData(parseOrganizationIdQuery(organizationId));
  }
}
