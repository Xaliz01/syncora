/** API contracts for order givers (donneurs d'ordre) — distincts des clients */

import type { CustomerKind, PostalAddress } from "./customer";

export interface CreateOrderGiverBody {
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
  isTestData?: boolean;
}

export interface UpdateOrderGiverBody {
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

export interface OrderGiverResponse {
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
  isTestData?: boolean;
}

export interface OrderGiversListResponse {
  orderGivers: OrderGiverResponse[];
  total: number;
}
