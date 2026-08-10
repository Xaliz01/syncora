import type {
  AuthUser,
  DataImportEntity,
  DataImportRollbackResponse,
  DataImportRunListResponse,
  DataImportRunResponse,
  DataImportSuggestMappingRequest,
  DataImportSuggestMappingResponse,
  DataImportValidateResponse,
} from "@planwise/shared";

export abstract class AbstractDataImportService {
  abstract validate(
    user: AuthUser,
    entity: DataImportEntity,
    file: Express.Multer.File,
  ): Promise<DataImportValidateResponse>;

  abstract run(
    user: AuthUser,
    entity: DataImportEntity,
    file: Express.Multer.File,
  ): Promise<DataImportRunResponse>;

  abstract suggestMapping(
    user: AuthUser,
    body: DataImportSuggestMappingRequest,
  ): Promise<DataImportSuggestMappingResponse>;

  abstract listRuns(
    user: AuthUser,
    opts?: { limit?: number; offset?: number },
  ): Promise<DataImportRunListResponse>;

  abstract rollbackRun(user: AuthUser, runId: string): Promise<DataImportRollbackResponse>;
}
