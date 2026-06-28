import { Controller, Delete, Query } from "@nestjs/common";
import { parseOrganizationIdQuery } from "@planwise/shared/nest";
import { AbstractCustomersService } from "../../domain/ports/customers.service.port";

@Controller("test-data")
export class TestDataController {
  constructor(private readonly customersService: AbstractCustomersService) {}

  @Delete()
  purge(@Query("organizationId") organizationId: string) {
    return this.customersService.purgeTestData(parseOrganizationIdQuery(organizationId));
  }
}
