import type { ArticleResponse, LocationStockEntry, StockStatus } from "@planwise/shared";
import type { ArticleDocument } from "../../persistence/article.schema";

export function computeStockStatus(stockQuantity: number, reorderPoint: number): StockStatus {
  if (stockQuantity <= 0) return "out";
  if (stockQuantity <= reorderPoint) return "low";
  return "ok";
}

export function toArticleResponse(doc: ArticleDocument): ArticleResponse {
  const stockStatus = computeStockStatus(doc.stockQuantity, doc.reorderPoint);
  const locationStocks: LocationStockEntry[] | undefined =
    doc.locationStocks && doc.locationStocks.length > 0
      ? doc.locationStocks.map((ls) => ({
          locationId: ls.locationId,
          quantity: ls.quantity,
        }))
      : undefined;
  return {
    id: doc._id.toString(),
    organizationId: doc.organizationId,
    name: doc.name,
    reference: doc.reference,
    description: doc.description,
    unit: doc.unit,
    defaultPrice: doc.defaultPrice,
    stockQuantity: doc.stockQuantity,
    reorderPoint: doc.reorderPoint,
    targetStock: doc.targetStock,
    isActive: doc.isActive,
    lastMovementAt: doc.lastMovementAt?.toISOString(),
    lowStock: stockStatus !== "ok",
    stockStatus,
    suggestedReorderQuantity: Math.max(doc.targetStock - doc.stockQuantity, 0),
    locationStocks,
    createdAt: doc.get("createdAt")?.toISOString(),
    updatedAt: doc.get("updatedAt")?.toISOString(),
    isTestData: doc.isTestData === true,
  };
}
