import type { InterventionPrestationUsageResponse } from "@planwise/shared";
import type { InterventionPrestationUsageDocument } from "../../persistence/intervention-prestation-usage.schema";

export function toInterventionPrestationUsageResponse(
  doc: InterventionPrestationUsageDocument,
  prestation: {
    name: string;
    reference?: string;
    unit: string;
    defaultPrice?: number;
    defaultTvaRate?: number;
  },
): InterventionPrestationUsageResponse {
  return {
    id: doc._id.toString(),
    organizationId: doc.organizationId,
    interventionId: doc.interventionId,
    caseId: doc.caseId,
    prestationId: doc.prestationId,
    prestationName: prestation.name,
    prestationReference: prestation.reference,
    unit: prestation.unit,
    quantity: doc.quantity,
    defaultPrice: prestation.defaultPrice,
    defaultTvaRate: prestation.defaultTvaRate,
    updatedAt: doc.get("updatedAt")?.toISOString?.() ?? undefined,
  };
}
