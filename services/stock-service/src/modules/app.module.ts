import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  HealthController,
  provideHealthServiceName,
  provideHttpAccessLogInterceptor,
} from "@planwise/shared/nest";
import { StockController } from "../presentation/http/stock.controller";
import { TestDataController } from "../presentation/http/test-data.controller";
import { AbstractStockService } from "../domain/ports/stock.service.port";
import { StockService } from "../domain/stock.service";
import { ArticleSchema } from "../persistence/article.schema";
import { StockMovementSchema } from "../persistence/stock-movement.schema";
import { StockLocationSchema } from "../persistence/stock-location.schema";

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI ?? "mongodb://localhost:27017/planwise-stock"),
    MongooseModule.forFeature([
      { name: "Article", schema: ArticleSchema },
      { name: "StockMovement", schema: StockMovementSchema },
      { name: "StockLocation", schema: StockLocationSchema },
    ]),
  ],
  controllers: [StockController, TestDataController, HealthController],
  providers: [
    provideHealthServiceName("planwise-stock-service"),
    provideHttpAccessLogInterceptor(),
    { provide: AbstractStockService, useClass: StockService },
  ],
})
export class AppModule {}
