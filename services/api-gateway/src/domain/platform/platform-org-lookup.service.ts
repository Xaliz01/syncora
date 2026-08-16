import { Injectable } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type {
  EffectivePermissionsResponse,
  JwtPayload,
  OrganizationResponse,
  PlatformUserSummary,
} from "@planwise/shared";
import { ASSIGNABLE_PERMISSION_CODES } from "@planwise/shared";
import { AbstractPlatformOrgLookupService } from "../ports/platform/platform-org-lookup.service.port";
import { SERVICE_URLS } from "../../infrastructure/service-urls.config";

@Injectable()
export class PlatformOrgLookupService extends AbstractPlatformOrgLookupService {
  constructor(private readonly httpService: HttpService) {
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
          const res = await firstValueFrom(
            this.httpService.get<OrganizationResponse>(
              `${SERVICE_URLS.organizations}/organizations/${id}`,
            ),
          );
          out[id] = res.data.name;
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
      const res = await firstValueFrom(
        this.httpService.post<EffectivePermissionsResponse>(
          `${SERVICE_URLS.permissions}/permissions/effective`,
          { organizationId, userId, role },
        ),
      );
      return res.data.permissions;
    } catch {
      return role === "admin" ? [...ASSIGNABLE_PERMISSION_CODES] : [];
    }
  }
}
