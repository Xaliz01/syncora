import type { OrderGiverResponse } from "@planwise/shared";
import type { OrderGiverDocument } from "../../persistence/order-giver.schema";

function orderGiverDisplayName(doc: OrderGiverDocument): string {
  if (doc.kind === "company") {
    return doc.companyName?.trim() || "Société";
  }
  const parts = [doc.firstName, doc.lastName].filter((p) => p?.trim()).map((p) => p!.trim());
  return parts.length > 0 ? parts.join(" ") : "Donneur d'ordre";
}

export function toOrderGiverResponse(doc: OrderGiverDocument): OrderGiverResponse {
  return {
    id: doc._id.toString(),
    organizationId: doc.organizationId,
    kind: doc.kind,
    displayName: orderGiverDisplayName(doc),
    firstName: doc.firstName,
    lastName: doc.lastName,
    companyName: doc.companyName,
    legalIdentifier: doc.legalIdentifier,
    email: doc.email,
    phone: doc.phone,
    mobile: doc.mobile,
    address: doc.address
      ? {
          line1: doc.address.line1,
          line2: doc.address.line2,
          postalCode: doc.address.postalCode,
          city: doc.address.city,
          country: doc.address.country ?? "FR",
        }
      : undefined,
    notes: doc.notes,
    createdAt: doc.get("createdAt")?.toISOString(),
    updatedAt: doc.get("updatedAt")?.toISOString(),
    isTestData: doc.isTestData === true,
  };
}
