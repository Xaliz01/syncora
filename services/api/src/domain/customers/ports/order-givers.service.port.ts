import type {
  CreateOrderGiverBody,
  OrderGiverResponse,
  OrderGiversListResponse,
  UpdateOrderGiverBody,
} from "@planwise/shared";

export abstract class AbstractOrderGiversService {
  abstract createOrderGiver(body: CreateOrderGiverBody): Promise<OrderGiverResponse>;
  abstract listOrderGivers(
    organizationId: string,
    filters?: { search?: string; ids?: string[]; limit?: number; offset?: number },
  ): Promise<OrderGiversListResponse>;
  abstract getOrderGiver(id: string, organizationId: string): Promise<OrderGiverResponse>;
  abstract updateOrderGiver(id: string, body: UpdateOrderGiverBody): Promise<OrderGiverResponse>;
  abstract deleteOrderGiver(id: string, organizationId: string): Promise<{ deleted: true }>;
  abstract purgeTestData(organizationId: string): Promise<{ purged: true }>;
}
