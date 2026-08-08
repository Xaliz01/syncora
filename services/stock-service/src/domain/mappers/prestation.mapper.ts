import type { PrestationResponse, TvaRate } from "@planwise/shared";
import type { PrestationDocument } from "../../persistence/prestation.schema";
import { normalizeTvaRate } from "../utils/validation.utils";

export function toPrestationResponse(doc: PrestationDocument): PrestationResponse {
  return {
    id: doc._id.toString(),
    organizationId: doc.organizationId,
    name: doc.name,
    reference: doc.reference,
    description: doc.description,
    unit: doc.unit,
    defaultPrice: doc.defaultPrice,
    defaultTvaRate: normalizeTvaRate(doc.defaultTvaRate) as TvaRate,
    isActive: doc.isActive,
    createdAt: doc.get("createdAt")?.toISOString(),
    updatedAt: doc.get("updatedAt")?.toISOString(),
    isTestData: doc.isTestData === true,
  };
}
