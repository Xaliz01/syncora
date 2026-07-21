import type {
  AuthResponse,
  LoginBody,
  PlatformAuthResponse,
  PlatformAuthUser,
  PlatformOrganizationDetailResponse,
  PlatformOrganizationsListResponse,
  PlatformUsersListResponse,
  StartImpersonationBody,
} from "@planwise/shared";

export abstract class AbstractPlatformService {
  abstract login(body: LoginBody): Promise<PlatformAuthResponse>;
  abstract getMe(user: PlatformAuthUser): Promise<PlatformAuthUser>;
  abstract listOrganizations(filters?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<PlatformOrganizationsListResponse>;
  abstract getOrganization(organizationId: string): Promise<PlatformOrganizationDetailResponse>;
  abstract listUsers(filters?: {
    search?: string;
    organizationId?: string;
    limit?: number;
    offset?: number;
  }): Promise<PlatformUsersListResponse>;
  abstract startImpersonation(
    staff: PlatformAuthUser,
    body: StartImpersonationBody,
  ): Promise<AuthResponse>;
}
