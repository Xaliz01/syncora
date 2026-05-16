import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type { AxiosRequestConfig } from "axios";
import {
  OrganizationScopeError,
  assertOrganizationScopedPayload,
  scopeRequestBody,
  scopeRequestQuery,
  requireOrganizationId,
} from "@syncora/shared";

export interface OrganizationScopedHttpRequest {
  baseUrl: string;
  organizationId: string;
  method: "get" | "post" | "patch" | "put" | "delete";
  path: string;
  body?: object;
  query?: Record<string, unknown>;
  /** Valide que la réponse appartient au tenant (défaut: true). */
  validateResponseScope?: boolean;
  axiosConfig?: AxiosRequestConfig;
  errorLabel?: string;
}

@Injectable()
export class OrganizationScopedHttpClient {
  constructor(private readonly httpService: HttpService) {}

  async request<T>(options: OrganizationScopedHttpRequest): Promise<T> {
    let organizationId: string;
    let query: Record<string, unknown>;
    let body: object | undefined;

    try {
      organizationId = requireOrganizationId(options.organizationId);
      query = scopeRequestQuery(organizationId, options.query);
      body =
        options.body !== undefined
          ? scopeRequestBody(organizationId, options.body)
          : undefined;
    } catch (err) {
      this.rethrowScopeError(err);
    }

    try {
      const response = await firstValueFrom(
        this.httpService.request<T>({
          method: options.method,
          url: `${options.baseUrl}${options.path}`,
          data: body,
          params: query,
          ...options.axiosConfig,
        }),
      );

      if (options.validateResponseScope !== false) {
        try {
          assertOrganizationScopedPayload(organizationId, response.data);
        } catch (err) {
          this.rethrowScopeError(err);
        }
      }

      return response.data;
    } catch (err: unknown) {
      if (err instanceof ForbiddenException) throw err;
      this.rethrowAsHttpException(err, options.errorLabel ?? "Downstream service error");
    }
  }

  private rethrowScopeError(err: unknown): never {
    if (err instanceof OrganizationScopeError) {
      if (err.message === "organizationId is required") {
        throw new BadRequestException(err.message);
      }
      throw new ForbiddenException(
        err.message === "organizationId mismatch"
          ? "organizationId mismatch"
          : "Réponse hors périmètre organisation",
      );
    }
    throw err;
  }

  private rethrowAsHttpException(err: unknown, fallbackMessage: string): never {
    const status = (err as { response?: { status?: number } })?.response?.status;
    const raw = (err as { response?: { data?: { message?: string | string[] } } })?.response
      ?.data?.message;
    const message = Array.isArray(raw) ? raw.join(", ") : (raw ?? fallbackMessage);

    if (status === 400) throw new BadRequestException(message);
    if (status === 403) throw new ForbiddenException(message);
    if (status === 404) throw new NotFoundException(message);
    if (status === 409) throw new ConflictException(message);
    throw err;
  }
}
