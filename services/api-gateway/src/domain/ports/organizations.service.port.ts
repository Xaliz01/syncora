import type { AuthUser, UserOrganizationsListResponse } from "@syncora/shared";

export abstract class AbstractOrganizationsGatewayService {
  abstract listMine(user: AuthUser): Promise<UserOrganizationsListResponse>;
}
