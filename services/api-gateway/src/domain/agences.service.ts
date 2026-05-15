import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type { AuthUser, CreateAgenceBody, UpdateAgenceBody, AgenceResponse } from "@syncora/shared";
import { AbstractAgencesGatewayService } from "./ports/agences.service.port";

const TECHNICIANS_URL = process.env.TECHNICIANS_SERVICE_URL ?? "http://localhost:3006";

@Injectable()
export class AgencesGatewayService extends AbstractAgencesGatewayService {
  constructor(private readonly httpService: HttpService) {
    super();
  }

  async createAgence(
    currentUser: AuthUser,
    body: {
      name: string;
      address?: string;
      city?: string;
      postalCode?: string;
      phone?: string;
    },
  ): Promise<AgenceResponse> {
    return this.call<AgenceResponse>({
      method: "post",
      path: "/agences",
      body: {
        organizationId: currentUser.organizationId,
        ...body,
      } satisfies CreateAgenceBody,
    });
  }

  async listAgences(currentUser: AuthUser): Promise<AgenceResponse[]> {
    return this.call<AgenceResponse[]>({
      method: "get",
      path: "/agences",
      query: { organizationId: currentUser.organizationId },
    });
  }

  async getAgence(currentUser: AuthUser, agenceId: string): Promise<AgenceResponse> {
    return this.call<AgenceResponse>({
      method: "get",
      path: `/agences/${agenceId}`,
      query: { organizationId: currentUser.organizationId },
    });
  }

  async updateAgence(
    currentUser: AuthUser,
    agenceId: string,
    body: UpdateAgenceBody,
  ): Promise<AgenceResponse> {
    return this.call<AgenceResponse>({
      method: "patch",
      path: `/agences/${agenceId}`,
      query: { organizationId: currentUser.organizationId },
      body,
    });
  }

  async deleteAgence(currentUser: AuthUser, agenceId: string): Promise<{ deleted: true }> {
    return this.call<{ deleted: true }>({
      method: "delete",
      path: `/agences/${agenceId}`,
      query: { organizationId: currentUser.organizationId },
    });
  }

  private async call<T>(params: {
    method: "get" | "post" | "patch" | "put" | "delete";
    path: string;
    body?: unknown;
    query?: Record<string, unknown>;
  }): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.request<T>({
          method: params.method,
          url: `${TECHNICIANS_URL}${params.path}`,
          data: params.body,
          params: params.query,
        }),
      );
      return response.data;
    } catch (err: unknown) {
      this.rethrowAsHttpException(err);
    }
  }

  private rethrowAsHttpException(err: unknown): never {
    const status = (err as { response?: { status?: number } })?.response?.status;
    const message =
      (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message ??
      "Downstream service error";

    if (status === 400) throw new BadRequestException(message);
    if (status === 403) throw new ForbiddenException(message);
    if (status === 404) throw new NotFoundException(message);
    if (status === 409) throw new ConflictException(message);
    throw err;
  }
}
