import { Controller, Delete, Query } from "@nestjs/common";
import { parseOrganizationIdQuery } from "@planwise/shared/nest";
import { AbstractFleetService } from "../../domain/ports/fleet.service.port";

@Controller("test-data")
export class TestDataController {
  constructor(private readonly fleetService: AbstractFleetService) {}

  @Delete()
  purge(@Query("organizationId") organizationId: string) {
    return this.fleetService.purgeTestData(parseOrganizationIdQuery(organizationId));
  }
}
