import type { CreateOrganizationBody, SiretLookupResult } from "@syncora/shared";

export interface OrganizationAddressForm {
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  country: string;
}

export const EMPTY_ORG_ADDRESS: OrganizationAddressForm = {
  addressLine1: "",
  addressLine2: "",
  postalCode: "",
  city: "",
  country: "FR",
};

export function addressFromSiretLookup(result: SiretLookupResult): OrganizationAddressForm {
  return {
    addressLine1: result.addressLine1 ?? "",
    addressLine2: result.addressLine2 ?? "",
    postalCode: result.postalCode ?? "",
    city: result.city ?? "",
    country: result.country ?? "FR",
  };
}

export function isOrganizationAddressComplete(address: OrganizationAddressForm): boolean {
  return (
    address.addressLine1.trim().length > 0 &&
    address.postalCode.trim().length > 0 &&
    address.city.trim().length > 0
  );
}

export function toCreateOrganizationAddress(
  address: OrganizationAddressForm,
): Pick<
  CreateOrganizationBody,
  "addressLine1" | "addressLine2" | "postalCode" | "city" | "country"
> {
  return {
    addressLine1: address.addressLine1.trim(),
    addressLine2: address.addressLine2.trim() || undefined,
    postalCode: address.postalCode.trim(),
    city: address.city.trim(),
    country: address.country.trim() || "FR",
  };
}
