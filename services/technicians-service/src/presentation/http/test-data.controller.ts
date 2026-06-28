import { Controller, Delete, Query } from "@nestjs/common";
import { parseOrganizationIdQuery } from "@planwise/shared/nest";
import { TestDataPurgeService } from "../../domain/test-data-purge.service";

@Controller("test-data")
export class TestDataController {
  constructor(private readonly testDataPurge: TestDataPurgeService) {}

  @Delete()
  purge(@Query("organizationId") organizationId: string) {
    return this.testDataPurge.purge(parseOrganizationIdQuery(organizationId));
  }
}
