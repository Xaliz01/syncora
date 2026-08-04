import { Controller, Delete, Query } from "@nestjs/common";
import { parseOrganizationIdQuery } from "@planwise/shared/nest";
import { AbstractCustomersService } from "../../domain/ports/customers.service.port";
import { AbstractOrderGiversService } from "../../domain/ports/order-givers.service.port";

@Controller("test-data")
export class TestDataController {
  constructor(
    private readonly customersService: AbstractCustomersService,
    private readonly orderGiversService: AbstractOrderGiversService,
  ) {}

  @Delete()
  async purge(@Query("organizationId") organizationId: string) {
    const orgId = parseOrganizationIdQuery(organizationId);
    await Promise.all([
      this.customersService.purgeTestData(orgId),
      this.orderGiversService.purgeTestData(orgId),
    ]);
    return { purged: true };
  }
}
