/** Contrat API organizations-service */

export interface CreateOrganizationBody {
  name: string;
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
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Organisations accessibles pour la session en cours (JWT). Évoluera vers plusieurs entrées par utilisateur. */
export interface UserOrganizationsListResponse {
  organizations: OrganizationResponse[];
}
