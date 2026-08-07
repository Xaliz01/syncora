/** Événement gateway : organisation créée. */
export const ORGANIZATION_CREATED_EVENT = "planwise.organization.created";

export interface OrganizationCreatedEvent {
  organizationId: string;
  name: string;
  siret?: string;
  email?: string;
  createdByUserId: string;
  createdByEmail?: string;
}
