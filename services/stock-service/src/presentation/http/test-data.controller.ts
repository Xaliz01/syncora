import { Controller, Delete, Query } from "@nestjs/common";
import { parseOrganizationIdQuery } from "@syncora/shared/nest";
import { AbstractStockService } from "../../domain/ports/stock.service.port";

@Controller("test-data")
export class TestDataController {
  constructor(private readonly stockService: AbstractStockService) {}

  @Delete()
  purge(@Query("organizationId") organizationId: string) {
    return this.stockService.purgeTestData(parseOrganizationIdQuery(organizationId));
  }
}
