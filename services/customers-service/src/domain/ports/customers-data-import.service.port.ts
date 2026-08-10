import type {
  DataImportBulkResult,
  DataImportDeleteCreatedBody,
  DataImportDeleteCreatedResult,
  ImportCustomerRow,
  ImportCustomerSiteRow,
  ImportCustomersBody,
  ImportCustomerSitesBody,
  ImportOrderGiverRow,
  ImportOrderGiversBody,
} from "@planwise/shared";

export abstract class AbstractCustomersDataImportService {
  abstract importCustomers(body: ImportCustomersBody): Promise<DataImportBulkResult>;
  abstract importCustomerSites(body: ImportCustomerSitesBody): Promise<DataImportBulkResult>;
  abstract importOrderGivers(body: ImportOrderGiversBody): Promise<DataImportBulkResult>;
  abstract deleteCreated(body: DataImportDeleteCreatedBody): Promise<DataImportDeleteCreatedResult>;
  abstract resolveCustomerIds(
    organizationId: string,
    externalIds: string[],
  ): Promise<Record<string, string>>;
  abstract resolveSiteIds(
    organizationId: string,
    externalIds: string[],
  ): Promise<Record<string, string>>;
  abstract resolveOrderGiverIds(
    organizationId: string,
    externalIds: string[],
  ): Promise<Record<string, string>>;
}

export type { ImportCustomerRow, ImportCustomerSiteRow, ImportOrderGiverRow };
