import type { AgenceResponse } from "@planwise/shared";
import type { AgenceDocument } from "../../persistence/agence.schema";

export function toAgenceResponse(doc: AgenceDocument): AgenceResponse {
  return {
    id: doc._id.toString(),
    organizationId: doc.organizationId,
    name: doc.name,
    address: doc.address,
    city: doc.city,
    postalCode: doc.postalCode,
    phone: doc.phone,
    createdAt: doc.get("createdAt")?.toISOString(),
    updatedAt: doc.get("updatedAt")?.toISOString(),
    isTestData: doc.isTestData === true,
  };
}
