import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import type { AuthUser } from "@syncora/shared";
import type { CreateCustomerBody, CustomerResponse, UpdateCustomerBody } from "@syncora/shared";
import {
  AbstractCustomersGatewayService,
  type CreateCustomerForOrgBody,
  type UpdateCustomerForOrgBody,
} from "./ports/customers.service.port";

const CUSTOMERS_URL = process.env.CUSTOMERS_SERVICE_URL ?? "http://localhost:3009";

@Injectable()
export class CustomersGatewayService extends AbstractCustomersGatewayService {
  constructor(private readonly httpService: HttpService) {
    super();
  }

  async createCustomer(user: AuthUser, body: CreateCustomerForOrgBody) {
    return this.callCustomers<CustomerResponse>({
      method: "post",
      path: "/customers",
      body: {
        organizationId: user.organizationId,
        ...body,
      } satisfies CreateCustomerBody,
    });
  }

  async listCustomers(user: AuthUser, filters?: { search?: string; ids?: string }) {
    return this.callCustomers<CustomerResponse[]>({
      method: "get",
      path: "/customers",
      query: {
        organizationId: user.organizationId,
        ...filters,
      },
    });
  }

  async listCustomersByIds(user: AuthUser, ids: string[]) {
    const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(0, 100);
    if (unique.length === 0) return [];
    return this.listCustomers(user, { ids: unique.join(",") });
  }

  async getCustomer(user: AuthUser, customerId: string) {
    return this.callCustomers<CustomerResponse>({
      method: "get",
      path: `/customers/${customerId}`,
      query: { organizationId: user.organizationId },
    });
  }

  async updateCustomer(user: AuthUser, customerId: string, body: UpdateCustomerForOrgBody) {
    return this.callCustomers<CustomerResponse>({
      method: "patch",
      path: `/customers/${customerId}`,
      body: {
        organizationId: user.organizationId,
        ...body,
      } satisfies UpdateCustomerBody,
    });
  }

  async deleteCustomer(user: AuthUser, customerId: string) {
    return this.callCustomers<{ deleted: true }>({
      method: "delete",
      path: `/customers/${customerId}`,
      query: { organizationId: user.organizationId },
    });
  }

  private async callCustomers<T>(params: {
    method: "get" | "post" | "patch" | "put" | "delete";
    path: string;
    body?: unknown;
    query?: Record<string, unknown>;
  }): Promise<T> {
    try {
      const response = await firstValueFrom(
        this.httpService.request<T>({
          method: params.method,
          url: `${CUSTOMERS_URL}${params.path}`,
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
      "Customers service error";

    if (status === 400) throw new BadRequestException(message);
    if (status === 403) throw new ForbiddenException(message);
    if (status === 404) throw new NotFoundException(message);
    if (status === 409) throw new ConflictException(message);
    throw err;
  }
}
