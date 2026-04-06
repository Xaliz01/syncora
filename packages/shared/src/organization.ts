/** Contrat API organizations-service */

export interface CreateOrganizationBody {
  name: string;
}

export interface OrganizationResponse {
  id: string;
  name: string;
  createdAt?: string;
}

/** Organisations accessibles pour la session en cours (JWT). Évoluera vers plusieurs entrées par utilisateur. */
export interface UserOrganizationsListResponse {
  organizations: OrganizationResponse[];
}
