import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ArticleSchema } from "../persistence/stock/article.schema";
import { PrestationSchema } from "../persistence/stock/prestation.schema";
import { StockMovementSchema } from "../persistence/stock/stock-movement.schema";
import { StockLocationSchema } from "../persistence/stock/stock-location.schema";
import { InterventionPrestationUsageSchema } from "../persistence/stock/intervention-prestation-usage.schema";
import { AbstractArticleStockService } from "../domain/stock/ports/article-stock.service.port";
import { AbstractPrestationService } from "../domain/stock/ports/prestation.service.port";
import { AbstractStockLocationService } from "../domain/stock/ports/stock-location.service.port";
import { AbstractStockDataImportService } from "../domain/stock/ports/stock-data-import.service.port";
import { AbstractInterventionPrestationUsageService } from "../domain/stock/ports/intervention-prestation-usage.service.port";
import { ArticleStockService } from "../domain/stock/article-stock.service";
import { PrestationService } from "../domain/stock/prestation.service";
import { StockLocationService } from "../domain/stock/stock-location.service";
import { StockDataImportService } from "../domain/stock/stock-data-import.service";
import { InterventionPrestationUsageService } from "../domain/stock/intervention-prestation-usage.service";

@Module({
  imports: [
    MongooseModule.forFeature(
      [
        { name: "Article", schema: ArticleSchema },
        { name: "Prestation", schema: PrestationSchema },
        { name: "StockMovement", schema: StockMovementSchema },
        { name: "StockLocation", schema: StockLocationSchema },
        { name: "InterventionPrestationUsage", schema: InterventionPrestationUsageSchema },
      ],
      "stock",
    ),
  ],
  providers: [
    { provide: AbstractArticleStockService, useClass: ArticleStockService },
    { provide: AbstractPrestationService, useClass: PrestationService },
    { provide: AbstractStockLocationService, useClass: StockLocationService },
    { provide: AbstractStockDataImportService, useClass: StockDataImportService },
    {
      provide: AbstractInterventionPrestationUsageService,
      useClass: InterventionPrestationUsageService,
    },
  ],
  exports: [
    AbstractArticleStockService,
    AbstractPrestationService,
    AbstractStockLocationService,
    AbstractStockDataImportService,
    AbstractInterventionPrestationUsageService,
  ],
})
export class StockDomainModule {}
