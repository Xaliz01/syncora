import type { InterventionTypeResponse } from "@planwise/shared";
import type { InterventionTypeDocument } from "../../persistence/intervention-type.schema";

export function toInterventionTypeResponse(
  doc: InterventionTypeDocument,
): InterventionTypeResponse {
  return {
    id: doc._id.toString(),
    organizationId: doc.organizationId,
    name: doc.name,
    description: doc.description,
    color: doc.color,
    createdAt: doc.get("createdAt")?.toISOString(),
    updatedAt: doc.get("updatedAt")?.toISOString(),
    isTestData: doc.isTestData === true,
  };
}
