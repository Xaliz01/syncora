import { Injectable, InternalServerErrorException, ServiceUnavailableException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import axios from "axios";
import { firstValueFrom } from "rxjs";
import type { AuthUser, OrganizationResponse, UserOrganizationsListResponse } from "@syncora/shared";
import { AbstractOrganizationsGatewayService } from "./ports/organizations.service.port";

const ORGANIZATIONS_URL =
  process.env.ORGANIZATIONS_SERVICE_URL ?? "http://localhost:3001";

@Injectable()
export class OrganizationsGatewayService extends AbstractOrganizationsGatewayService {
  constructor(private readonly httpService: HttpService) {
    super();
  }

  async listMine(user: AuthUser): Promise<UserOrganizationsListResponse> {
    const org = await this.fetchOrganization(user.organizationId);
    return { organizations: org ? [org] : [] };
  }

  private async fetchOrganization(organizationId: string): Promise<OrganizationResponse | null> {
    try {
      const res = await firstValueFrom(
        this.httpService.get<OrganizationResponse>(`${ORGANIZATIONS_URL}/organizations/${organizationId}`)
      );
      return res.data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 404) return null;
        const netCode = err.code;
        if (
          !err.response &&
          (netCode === "ECONNREFUSED" ||
            netCode === "ECONNRESET" ||
            netCode === "ETIMEDOUT" ||
            netCode === "ENOTFOUND")
        ) {
          throw new ServiceUnavailableException(
            `Service organizations injoignable (${ORGANIZATIONS_URL}).`
          );
        }
      }
      throw new InternalServerErrorException("Impossible de charger l’organisation");
    }
  }
}
