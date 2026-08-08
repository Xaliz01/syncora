import type { StockMovementResponse } from "@planwise/shared";
import type { StockMovementDocument } from "../../persistence/stock-movement.schema";

export function toStockMovementResponse(doc: StockMovementDocument): StockMovementResponse {
  return {
    id: doc._id.toString(),
    organizationId: doc.organizationId,
    articleId: doc.articleId,
    articleName: doc.articleName,
    articleReference: doc.articleReference,
    movementType: doc.movementType,
    quantity: doc.quantity,
    previousStock: doc.previousStock,
    newStock: doc.newStock,
    note: doc.note,
    reason: doc.reason,
    locationId: doc.locationId,
    locationName: doc.locationName,
    destinationLocationId: doc.destinationLocationId,
    destinationLocationName: doc.destinationLocationName,
    interventionId: doc.interventionId,
    caseId: doc.caseId,
    actorUserId: doc.actorUserId,
    actorUserName: doc.actorUserName,
    createdAt: doc.get("createdAt")?.toISOString(),
  };
}
