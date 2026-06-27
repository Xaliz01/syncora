/** Contrat API organizations-service */

import type { TrialTestDataStatus } from "./test-data";

export interface OrganizationTrialTestData {
  status: TrialTestDataStatus;
  injectedAt?: string;
  errorMessage?: string | null;
}

export interface CreateOrganizationBody {
  name: string;
  siret?: string;
}

export interface UpdateOrganizationBody {
  name?: string;
  email?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
}

export interface OrganizationResponse {
  id: string;
  name: string;
  siret?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  createdAt?: string;
  updatedAt?: string;
  trialTestData?: OrganizationTrialTestData;
}

export interface UpdateOrganizationTrialTestDataBody {
  status: TrialTestDataStatus;
  injectedAt?: string | null;
  errorMessage?: string | null;
}

/** Organisations accessibles pour la session en cours (JWT). Évoluera vers plusieurs entrées par utilisateur. */
export interface UserOrganizationsListResponse {
  organizations: OrganizationResponse[];
}

/** Résultat renvoyé par la recherche SIRET (API Recherche d'entreprises). */
export interface SiretLookupResult {
  siret: string;
  siren: string;
  nom: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  city?: string;
  country?: string;
}

export interface SiretLookupResponse {
  results: SiretLookupResult[];
}
