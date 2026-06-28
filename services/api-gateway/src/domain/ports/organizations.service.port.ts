import type {
  AuthUser,
  OrganizationResponse,
  SiretLookupResponse,
  UpdateOrganizationBody,
  UserOrganizationsListResponse,
} from "@planwise/shared";

export abstract class AbstractOrganizationsGatewayService {
  abstract listMine(user: AuthUser): Promise<UserOrganizationsListResponse>;
  abstract getMine(user: AuthUser): Promise<OrganizationResponse | null>;
  abstract updateMine(
    user: AuthUser,
    body: UpdateOrganizationBody,
  ): Promise<OrganizationResponse | null>;
  abstract lookupSiret(query: string): Promise<SiretLookupResponse>;
}
