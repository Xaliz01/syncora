import type { OrganizationResponse, UpdateOrganizationBody } from "@syncora/shared";

export abstract class AbstractOrganizationsService {
  abstract create(name: string): Promise<OrganizationResponse>;
  abstract findById(id: string): Promise<OrganizationResponse | null>;
  abstract update(id: string, body: UpdateOrganizationBody): Promise<OrganizationResponse | null>;
}
