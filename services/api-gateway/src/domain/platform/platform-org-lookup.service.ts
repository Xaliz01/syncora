import { Injectable } from "@nestjs/common";
import type { JwtPayload, PlatformUserSummary } from "@planwise/shared";
import { ASSIGNABLE_PERMISSION_CODES } from "@planwise/shared";
import { AbstractPlatformOrgLookupService } from "../ports/platform/platform-org-lookup.service.port";
import { AbstractOrganizationsService } from "../organizations/ports/organizations.service.port";
import { AbstractPermissionsService } from "../permissions/ports/permissions.service.port";

@Injectable()
export class PlatformOrgLookupService extends AbstractPlatformOrgLookupService {
  constructor(
    private readonly organizations: AbstractOrganizationsService,
    private readonly permissions: AbstractPermissionsService,
  ) {
    super();
  }

  async enrichUsersWithOrgNames(
    users: PlatformUserSummary[],
    orgNames: Record<string, string>,
  ): Promise<PlatformUserSummary[]> {
    return users.map((u) => ({
      ...u,
      organizationName: u.organizationId ? orgNames[u.organizationId] : undefined,
    }));
  }

  async resolveOrganizationNames(ids: string[]): Promise<Record<string, string>> {
    const out: Record<string, string> = {};
    await Promise.all(
      ids.map(async (id) => {
        try {
          const org = await this.organizations.findById(id);
          if (org?.name) out[id] = org.name;
        } catch {
          /* ignore */
        }
      }),
    );
    return out;
  }

  async resolvePermissions(
    organizationId: string,
    userId: string,
    role: "admin" | "member",
  ): Promise<JwtPayload["permissions"]> {
    try {
      const res = await this.permissions.resolveEffectivePermissions({
        organizationId,
        userId,
        role,
      });
      return res.permissions;
    } catch {
      return role === "admin" ? [...ASSIGNABLE_PERMISSION_CODES] : [];
    }
  }
}
