import type { JwtPayload, PlatformUserSummary } from "@planwise/shared";

export abstract class AbstractPlatformOrgLookupService {
  abstract enrichUsersWithOrgNames(
    users: PlatformUserSummary[],
    orgNames: Record<string, string>,
  ): Promise<PlatformUserSummary[]>;
  abstract resolveOrganizationNames(ids: string[]): Promise<Record<string, string>>;
  abstract resolvePermissions(
    organizationId: string,
    userId: string,
    role: "admin" | "member",
  ): Promise<JwtPayload["permissions"]>;
}
