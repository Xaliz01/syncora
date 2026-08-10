import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  HealthController,
  provideHealthServiceName,
  provideHttpAccessLogInterceptor,
} from "@planwise/shared/nest";
import { StockController } from "../presentation/http/stock.controller";
import { TestDataController } from "../presentation/http/test-data.controller";
import { StockDataImportController } from "../presentation/http/stock-data-import.controller";
import { AbstractArticleStockService } from "../domain/ports/article-stock.service.port";
import { AbstractPrestationService } from "../domain/ports/prestation.service.port";
import { AbstractStockLocationService } from "../domain/ports/stock-location.service.port";
import { AbstractStockDataImportService } from "../domain/ports/stock-data-import.service.port";
import { ArticleStockService } from "../domain/article-stock.service";
import { PrestationService } from "../domain/prestation.service";
import { StockLocationService } from "../domain/stock-location.service";
import { StockDataImportService } from "../domain/stock-data-import.service";
import { ArticleSchema } from "../persistence/article.schema";
import { PrestationSchema } from "../persistence/prestation.schema";
import { StockMovementSchema } from "../persistence/stock-movement.schema";
import { StockLocationSchema } from "../persistence/stock-location.schema";

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI ?? "mongodb://localhost:27017/planwise-stock"),
    MongooseModule.forFeature([
      { name: "Article", schema: ArticleSchema },
      { name: "Prestation", schema: PrestationSchema },
      { name: "StockMovement", schema: StockMovementSchema },
      { name: "StockLocation", schema: StockLocationSchema },
    ]),
  ],
  controllers: [StockController, StockDataImportController, TestDataController, HealthController],
  providers: [
    provideHealthServiceName("planwise-stock-service"),
    provideHttpAccessLogInterceptor(),
    { provide: AbstractArticleStockService, useClass: ArticleStockService },
    { provide: AbstractPrestationService, useClass: PrestationService },
    { provide: AbstractStockLocationService, useClass: StockLocationService },
    { provide: AbstractStockDataImportService, useClass: StockDataImportService },
  ],
})
export class AppModule {}
