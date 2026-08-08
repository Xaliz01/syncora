import { Controller, Delete, Query } from "@nestjs/common";
import { parseOrganizationIdQuery } from "@planwise/shared/nest";
import { AbstractArticleStockService } from "../../domain/ports/article-stock.service.port";
import { AbstractPrestationService } from "../../domain/ports/prestation.service.port";
import { AbstractStockLocationService } from "../../domain/ports/stock-location.service.port";

@Controller("test-data")
export class TestDataController {
  constructor(
    private readonly articleStockService: AbstractArticleStockService,
    private readonly prestationService: AbstractPrestationService,
    private readonly stockLocationService: AbstractStockLocationService,
  ) {}

  @Delete()
  async purge(@Query("organizationId") organizationId: string) {
    const orgId = parseOrganizationIdQuery(organizationId);
    await this.articleStockService.purgeTestData(orgId);
    await this.prestationService.purgeTestData(orgId);
    await this.stockLocationService.purgeTestData(orgId);
    return { purged: true };
  }
}
