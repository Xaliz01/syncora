import { Injectable } from "@nestjs/common";
import type { AuthUser } from "@syncora/shared";
import type { CustomerResponse } from "@syncora/shared";
import { OrganizationScopedHttpClient } from "../infrastructure/organization-scoped-http.client";
import {
  AbstractCustomersGatewayService,
  type CreateCustomerForOrgBody,
  type UpdateCustomerForOrgBody,
} from "./ports/customers.service.port";

const CUSTOMERS_URL = process.env.CUSTOMERS_SERVICE_URL ?? "http://localhost:3009";

@Injectable()
export class CustomersGatewayService extends AbstractCustomersGatewayService {
  constructor(private readonly scopedHttp: OrganizationScopedHttpClient) {
    super();
  }

  async createCustomer(user: AuthUser, body: CreateCustomerForOrgBody) {
    return this.scopedHttp.request<CustomerResponse>({
      baseUrl: CUSTOMERS_URL,
      organizationId: user.organizationId,
      method: "post",
      path: "/customers",
      body: { ...body },
      errorLabel: "Customers service error",
    });
  }

  async listCustomers(user: AuthUser, filters?: { search?: string; ids?: string }) {
    return this.scopedHttp.request<CustomerResponse[]>({
      baseUrl: CUSTOMERS_URL,
      organizationId: user.organizationId,
      method: "get",
      path: "/customers",
      query: filters,
      errorLabel: "Customers service error",
    });
  }

  async listCustomersByIds(user: AuthUser, ids: string[]) {
    const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(0, 100);
    if (unique.length === 0) return [];
    return this.listCustomers(user, { ids: unique.join(",") });
  }

  async getCustomer(user: AuthUser, customerId: string) {
    return this.scopedHttp.request<CustomerResponse>({
      baseUrl: CUSTOMERS_URL,
      organizationId: user.organizationId,
      method: "get",
      path: `/customers/${customerId}`,
      errorLabel: "Customers service error",
    });
  }

  async updateCustomer(user: AuthUser, customerId: string, body: UpdateCustomerForOrgBody) {
    return this.scopedHttp.request<CustomerResponse>({
      baseUrl: CUSTOMERS_URL,
      organizationId: user.organizationId,
      method: "patch",
      path: `/customers/${customerId}`,
      body: { ...body },
      errorLabel: "Customers service error",
    });
  }

  async deleteCustomer(user: AuthUser, customerId: string) {
    return this.scopedHttp.request<{ deleted: true }>({
      baseUrl: CUSTOMERS_URL,
      organizationId: user.organizationId,
      method: "delete",
      path: `/customers/${customerId}`,
      validateResponseScope: false,
      errorLabel: "Customers service error",
    });
  }
}
