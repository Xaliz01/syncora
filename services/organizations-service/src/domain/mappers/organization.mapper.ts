import type { OrganizationResponse } from "@planwise/shared";
import type { OrganizationDocument } from "../../persistence/organization.schema";

export function toOrganizationResponse(doc: OrganizationDocument): OrganizationResponse {
  return {
    id: doc._id.toString(),
    name: doc.name,
    siret: doc.siret,
    email: doc.email,
    phone: doc.phone,
    addressLine1: doc.addressLine1,
    addressLine2: doc.addressLine2,
    postalCode: doc.postalCode,
    city: doc.city,
    country: doc.country,
    logoDocumentId: doc.logoDocumentId || undefined,
    createdAt: doc.get("createdAt")?.toISOString(),
    updatedAt: doc.get("updatedAt")?.toISOString(),
    trialTestData: doc.trialTestData
      ? {
          status: doc.trialTestData.status,
          injectedAt: doc.trialTestData.injectedAt?.toISOString(),
          errorMessage: doc.trialTestData.errorMessage ?? null,
        }
      : undefined,
  };
}
