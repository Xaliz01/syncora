import type { OrganizationResponse } from "@syncora/shared";

export abstract class AbstractOrganizationsService {
  abstract create(name: string): Promise<OrganizationResponse>;
  abstract findById(id: string): Promise<OrganizationResponse | null>;
}
