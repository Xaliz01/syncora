/** Contrat API organizations-service */

import type { TrialTestDataStatus } from "./test-data";

export interface OrganizationTrialTestData {
  status: TrialTestDataStatus;
  injectedAt?: string;
  errorMessage?: string | null;
}

export interface CreateOrganizationBody {
  name: string;
  siret: string;
  /** E-mail de facturation / contact de l’organisation (requis). */
  email: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  city?: string;
  country?: string;
}

export interface UpdateOrganizationBody {
  name?: string;
  /** E-mail de facturation (requis si fourni — ne peut pas être vidé). */
  email?: string;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country?: string | null;
  /** Document image (documents-service) servant de logo — null pour retirer. */
  logoDocumentId?: string | null;
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
  logoDocumentId?: string;
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
