import type {
  DataImportBulkResult,
  DataImportDeleteCreatedBody,
  DataImportDeleteCreatedResult,
  ImportArticlesBody,
  ImportPrestationsBody,
} from "@planwise/shared";

export abstract class AbstractStockDataImportService {
  abstract importArticles(body: ImportArticlesBody): Promise<DataImportBulkResult>;
  abstract importPrestations(body: ImportPrestationsBody): Promise<DataImportBulkResult>;
  abstract deleteCreated(body: DataImportDeleteCreatedBody): Promise<DataImportDeleteCreatedResult>;
}
