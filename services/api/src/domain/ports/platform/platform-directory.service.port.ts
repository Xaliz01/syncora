import type {
  AuthResponse,
  PlatformAuthUser,
  PlatformOrganizationDetailResponse,
  PlatformOrganizationsListResponse,
  PlatformSendUserEmailBody,
  PlatformSendUserEmailResponse,
  PlatformUsersListResponse,
  StartImpersonationBody,
} from "@planwise/shared";

export abstract class AbstractPlatformDirectoryService {
  abstract listOrganizations(filters?: {
    search?: string;
    includeTestAccounts?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<PlatformOrganizationsListResponse>;
  abstract getOrganization(organizationId: string): Promise<PlatformOrganizationDetailResponse>;
  abstract staffExtendOrganizationTrial(
    organizationId: string,
  ): Promise<PlatformOrganizationDetailResponse["subscription"]>;
  abstract listUsers(filters?: {
    search?: string;
    organizationId?: string;
    activeOnly?: boolean;
    includeTestAccounts?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<PlatformUsersListResponse>;
  abstract sendUserEmail(
    staff: PlatformAuthUser,
    userId: string,
    body: PlatformSendUserEmailBody,
  ): Promise<PlatformSendUserEmailResponse>;
  abstract startImpersonation(
    staff: PlatformAuthUser,
    body: StartImpersonationBody,
  ): Promise<AuthResponse>;
}
