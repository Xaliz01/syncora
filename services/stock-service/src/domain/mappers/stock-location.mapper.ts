import type { StockLocationResponse } from "@planwise/shared";
import type { StockLocationDocument } from "../../persistence/stock-location.schema";

export function toStockLocationResponse(doc: StockLocationDocument): StockLocationResponse {
  return {
    id: doc._id.toString(),
    organizationId: doc.organizationId,
    name: doc.name,
    type: doc.type,
    referenceId: doc.referenceId,
    address: doc.address,
    isDefault: doc.isDefault,
    createdAt: doc.get("createdAt")?.toISOString(),
    updatedAt: doc.get("updatedAt")?.toISOString(),
    isTestData: doc.isTestData === true,
  };
}
