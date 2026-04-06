/** API contracts for customers (clients) — personnes physiques ou morales */

export type CustomerKind = "individual" | "company";

export interface PostalAddress {
  line1: string;
  line2?: string;
  postalCode: string;
  city: string;
  /** Code pays ISO 3166-1 alpha-2, ex. FR */
  country: string;
}

export interface CreateCustomerBody {
  organizationId: string;
  kind: CustomerKind;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  /** Ex. SIRET, numéro TVA */
  legalIdentifier?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: PostalAddress;
  notes?: string;
}

export interface UpdateCustomerBody {
  organizationId: string;
  kind?: CustomerKind;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  legalIdentifier?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  address?: PostalAddress | null;
  notes?: string | null;
}

export interface CustomerResponse {
  id: string;
  organizationId: string;
  kind: CustomerKind;
  /** Libellé court pour listes et dossiers */
  displayName: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  legalIdentifier?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: PostalAddress;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}
