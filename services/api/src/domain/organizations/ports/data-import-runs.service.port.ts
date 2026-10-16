import type {
  CreateDataImportRunBody,
  DataImportRunListResponse,
  DataImportRunSummary,
} from "@planwise/shared";

export abstract class AbstractDataImportRunsService {
  abstract create(body: CreateDataImportRunBody): Promise<DataImportRunSummary>;
  abstract list(
    organizationId: string,
    opts?: { limit?: number; offset?: number },
  ): Promise<DataImportRunListResponse>;
  abstract findById(organizationId: string, id: string): Promise<DataImportRunSummary | null>;
  /** Retourne aussi les ids créés (pour le gateway). */
  abstract findByIdWithIds(
    organizationId: string,
    id: string,
  ): Promise<(DataImportRunSummary & { createdResourceIds: string[] }) | null>;
  abstract markRolledBack(organizationId: string, id: string): Promise<DataImportRunSummary>;
}
