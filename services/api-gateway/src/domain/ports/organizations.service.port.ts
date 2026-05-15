import type {
  AuthUser,
  OrganizationResponse,
  UpdateOrganizationBody,
  UserOrganizationsListResponse,
} from "@syncora/shared";

export abstract class AbstractOrganizationsGatewayService {
  abstract listMine(user: AuthUser): Promise<UserOrganizationsListResponse>;
  abstract getMine(user: AuthUser): Promise<OrganizationResponse | null>;
  abstract updateMine(
    user: AuthUser,
    body: UpdateOrganizationBody,
  ): Promise<OrganizationResponse | null>;
}
