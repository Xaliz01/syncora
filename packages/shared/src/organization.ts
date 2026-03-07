/** Contrat API organizations-service */

export interface CreateOrganizationBody {
  name: string;
}

export interface OrganizationResponse {
  id: string;
  name: string;
  createdAt?: string;
}
