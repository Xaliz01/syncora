import { Injectable } from "@nestjs/common";
import type { AuthUser, OrderGiverResponse, OrderGiversListResponse } from "@planwise/shared";
import { OrganizationScopedHttpClient } from "../infrastructure/organization-scoped-http.client";
import {
  AbstractOrderGiversGatewayService,
  type CreateOrderGiverForOrgBody,
  type UpdateOrderGiverForOrgBody,
} from "./ports/order-givers.service.port";

const CUSTOMERS_URL = process.env.CUSTOMERS_SERVICE_URL ?? "http://localhost:3009";

@Injectable()
export class OrderGiversGatewayService extends AbstractOrderGiversGatewayService {
  constructor(private readonly scopedHttp: OrganizationScopedHttpClient) {
    super();
  }

  async createOrderGiver(user: AuthUser, body: CreateOrderGiverForOrgBody) {
    return this.scopedHttp.request<OrderGiverResponse>({
      baseUrl: CUSTOMERS_URL,
      organizationId: user.organizationId,
      method: "post",
      path: "/order-givers",
      body: { ...body },
      errorLabel: "Order givers service error",
    });
  }

  async listOrderGivers(
    user: AuthUser,
    filters?: { search?: string; ids?: string; limit?: number; offset?: number },
  ) {
    return this.scopedHttp.request<OrderGiversListResponse>({
      baseUrl: CUSTOMERS_URL,
      organizationId: user.organizationId,
      method: "get",
      path: "/order-givers",
      query: filters,
      errorLabel: "Order givers service error",
    });
  }

  async listOrderGiversByIds(user: AuthUser, ids: string[]) {
    const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(0, 100);
    if (unique.length === 0) return [];
    const response = await this.listOrderGivers(user, { ids: unique.join(",") });
    return response.orderGivers;
  }

  async getOrderGiver(user: AuthUser, orderGiverId: string) {
    return this.scopedHttp.request<OrderGiverResponse>({
      baseUrl: CUSTOMERS_URL,
      organizationId: user.organizationId,
      method: "get",
      path: `/order-givers/${orderGiverId}`,
      errorLabel: "Order givers service error",
    });
  }

  async updateOrderGiver(user: AuthUser, orderGiverId: string, body: UpdateOrderGiverForOrgBody) {
    return this.scopedHttp.request<OrderGiverResponse>({
      baseUrl: CUSTOMERS_URL,
      organizationId: user.organizationId,
      method: "patch",
      path: `/order-givers/${orderGiverId}`,
      body: { ...body },
      errorLabel: "Order givers service error",
    });
  }

  async deleteOrderGiver(user: AuthUser, orderGiverId: string) {
    return this.scopedHttp.request<{ deleted: true }>({
      baseUrl: CUSTOMERS_URL,
      organizationId: user.organizationId,
      method: "delete",
      path: `/order-givers/${orderGiverId}`,
      validateResponseScope: false,
      errorLabel: "Order givers service error",
    });
  }
}
