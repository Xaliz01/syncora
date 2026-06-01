import { Controller, Delete, Query } from "@nestjs/common";
import { parseOrganizationIdQuery } from "@syncora/shared/nest";
import { AbstractPermissionsService } from "../../domain/ports/permissions.service.port";

@Controller("test-data")
export class TestDataController {
  constructor(private readonly permissionsService: AbstractPermissionsService) {}

  @Delete()
  purge(@Query("organizationId") organizationId: string) {
    return this.permissionsService.purgeTestData(parseOrganizationIdQuery(organizationId));
  }
}
