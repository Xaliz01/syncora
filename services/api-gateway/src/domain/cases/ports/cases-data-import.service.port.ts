import type {
  DataImportBulkResult,
  DataImportDeleteCreatedBody,
  DataImportDeleteCreatedResult,
  ImportCasesBody,
  ImportInterventionsBody,
} from "@planwise/shared";

export abstract class AbstractCasesDataImportService {
  abstract importCases(body: ImportCasesBody): Promise<DataImportBulkResult>;
  abstract importInterventions(body: ImportInterventionsBody): Promise<DataImportBulkResult>;
  abstract deleteCreated(body: DataImportDeleteCreatedBody): Promise<DataImportDeleteCreatedResult>;
  abstract resolveCaseIds(
    organizationId: string,
    externalIds: string[],
  ): Promise<Record<string, string>>;
}
