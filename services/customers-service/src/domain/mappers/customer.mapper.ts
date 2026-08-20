import type {
  CustomerContactResponse,
  CustomerResponse,
  CustomerSiteResponse,
} from "@planwise/shared";
import type {
  CustomerContactSubDoc,
  CustomerDocument,
  CustomerSiteSubDoc,
} from "../../persistence/customer.schema";

export function customerDisplayName(doc: {
  kind: string;
  companyName?: string;
  firstName?: string;
  lastName?: string;
}): string {
  if (doc.kind === "company") {
    return doc.companyName?.trim() || "Société";
  }
  const parts = [doc.firstName, doc.lastName].filter((p) => p?.trim()).map((p) => p!.trim());
  return parts.length > 0 ? parts.join(" ") : "Client";
}

export function toSiteResponse(site: CustomerSiteSubDoc): CustomerSiteResponse {
  return {
    id: site._id.toString(),
    label: site.label,
    address: {
      line1: site.address.line1,
      line2: site.address.line2,
      postalCode: site.address.postalCode,
      city: site.address.city,
      country: site.address.country ?? "FR",
    },
    isDefault: site.isDefault || undefined,
    notes: site.notes,
  };
}

export function toContactResponse(contact: CustomerContactSubDoc): CustomerContactResponse {
  return {
    id: contact._id.toString(),
    name: contact.name,
    role: contact.role,
    phone: contact.phone,
    mobile: contact.mobile,
    email: contact.email,
    notes: contact.notes,
  };
}

export function toCustomerResponse(doc: CustomerDocument): CustomerResponse {
  return {
    id: doc._id.toString(),
    organizationId: doc.organizationId,
    kind: doc.kind,
    displayName: customerDisplayName(doc),
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
    sites: doc.sites?.length ? doc.sites.map((s) => toSiteResponse(s)) : undefined,
    contacts: doc.contacts?.length ? doc.contacts.map((c) => toContactResponse(c)) : undefined,
    createdAt: doc.get("createdAt")?.toISOString(),
    updatedAt: doc.get("updatedAt")?.toISOString(),
    isTestData: doc.isTestData === true,
  };
}
