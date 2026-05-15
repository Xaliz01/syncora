import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { StockController } from "../presentation/http/stock.controller";
import { AbstractStockService } from "../domain/ports/stock.service.port";
import { StockService } from "../domain/stock.service";
import { ArticleSchema } from "../persistence/article.schema";
import { StockMovementSchema } from "../persistence/stock-movement.schema";

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGODB_URI ?? "mongodb://localhost:27017/syncora-stock"),
    MongooseModule.forFeature([
      { name: "Article", schema: ArticleSchema },
      { name: "StockMovement", schema: StockMovementSchema },
    ]),
  ],
  controllers: [StockController],
  providers: [{ provide: AbstractStockService, useClass: StockService }],
})
export class AppModule {}
