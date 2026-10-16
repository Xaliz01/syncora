import { Injectable } from "@nestjs/common";
import type { AuthUser, CreateOrderGiverBody, UpdateOrderGiverBody } from "@planwise/shared";
import {
  AbstractOrderGiversGatewayService,
  type CreateOrderGiverForOrgBody,
  type UpdateOrderGiverForOrgBody,
} from "./ports/order-givers.service.port";
import { AbstractOrderGiversService } from "./customers/ports/order-givers.service.port";

function parseIds(ids?: string): string[] | undefined {
  if (!ids?.trim()) return undefined;
  return ids
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

@Injectable()
export class OrderGiversGatewayService extends AbstractOrderGiversGatewayService {
  constructor(private readonly orderGiversService: AbstractOrderGiversService) {
    super();
  }

  async createOrderGiver(user: AuthUser, body: CreateOrderGiverForOrgBody) {
    return this.orderGiversService.createOrderGiver({
      ...body,
      organizationId: user.organizationId,
    } as CreateOrderGiverBody);
  }

  async listOrderGivers(
    user: AuthUser,
    filters?: { search?: string; ids?: string; limit?: number; offset?: number },
  ) {
    return this.orderGiversService.listOrderGivers(user.organizationId, {
      search: filters?.search,
      ids: parseIds(filters?.ids),
      limit: filters?.limit,
      offset: filters?.offset,
    });
  }

  async listOrderGiversByIds(user: AuthUser, ids: string[]) {
    const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(0, 100);
    if (unique.length === 0) return [];
    const response = await this.orderGiversService.listOrderGivers(user.organizationId, {
      ids: unique,
    });
    return response.orderGivers;
  }

  async getOrderGiver(user: AuthUser, orderGiverId: string) {
    return this.orderGiversService.getOrderGiver(orderGiverId, user.organizationId);
  }

  async updateOrderGiver(user: AuthUser, orderGiverId: string, body: UpdateOrderGiverForOrgBody) {
    return this.orderGiversService.updateOrderGiver(orderGiverId, {
      ...body,
      organizationId: user.organizationId,
    } as UpdateOrderGiverBody);
  }

  async deleteOrderGiver(user: AuthUser, orderGiverId: string) {
    return this.orderGiversService.deleteOrderGiver(orderGiverId, user.organizationId);
  }
}
