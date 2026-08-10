import { Body, Controller, Post } from "@nestjs/common";
import type {
  DataImportDeleteCreatedBody,
  ImportArticlesBody,
  ImportPrestationsBody,
} from "@planwise/shared";
import { AbstractStockDataImportService } from "../../domain/ports/stock-data-import.service.port";

@Controller("import")
export class StockDataImportController {
  constructor(private readonly importService: AbstractStockDataImportService) {}

  @Post("articles")
  importArticles(@Body() body: ImportArticlesBody) {
    return this.importService.importArticles(body);
  }

  @Post("prestations")
  importPrestations(@Body() body: ImportPrestationsBody) {
    return this.importService.importPrestations(body);
  }

  @Post("delete-created")
  deleteCreated(@Body() body: DataImportDeleteCreatedBody) {
    return this.importService.deleteCreated(body);
  }
}
