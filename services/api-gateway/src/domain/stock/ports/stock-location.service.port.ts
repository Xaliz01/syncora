import type {
  CreateStockLocationBody,
  StockLocationResponse,
  UpdateStockLocationBody,
} from "@planwise/shared";

export abstract class AbstractStockLocationService {
  abstract createStockLocation(body: CreateStockLocationBody): Promise<StockLocationResponse>;
  abstract listStockLocations(organizationId: string): Promise<StockLocationResponse[]>;
  abstract getStockLocation(id: string, organizationId: string): Promise<StockLocationResponse>;
  abstract updateStockLocation(
    id: string,
    body: UpdateStockLocationBody,
  ): Promise<StockLocationResponse>;
  abstract deleteStockLocation(id: string, organizationId: string): Promise<{ deleted: true }>;
  abstract resolveLocationId(organizationId: string, locationId: string): Promise<string>;
  abstract getDefaultLocationId(organizationId: string): Promise<string | null>;
  abstract getLocationName(organizationId: string, locationId: string): Promise<string | undefined>;
  abstract purgeTestData(organizationId: string): Promise<void>;
}
