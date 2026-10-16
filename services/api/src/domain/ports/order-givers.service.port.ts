import type {
  AuthUser,
  CustomerKind,
  OrderGiverResponse,
  OrderGiversListResponse,
  PostalAddress,
} from "@planwise/shared";

export interface CreateOrderGiverForOrgBody {
  kind: CustomerKind;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  legalIdentifier?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: PostalAddress;
  notes?: string;
}

export interface UpdateOrderGiverForOrgBody {
  kind?: CustomerKind;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  legalIdentifier?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  address?: PostalAddress | null;
  notes?: string | null;
}

export abstract class AbstractOrderGiversGatewayService {
  abstract createOrderGiver(
    user: AuthUser,
    body: CreateOrderGiverForOrgBody,
  ): Promise<OrderGiverResponse>;
  abstract listOrderGivers(
    user: AuthUser,
    filters?: { search?: string; ids?: string; limit?: number; offset?: number },
  ): Promise<OrderGiversListResponse>;
  abstract listOrderGiversByIds(user: AuthUser, ids: string[]): Promise<OrderGiverResponse[]>;
  abstract getOrderGiver(user: AuthUser, orderGiverId: string): Promise<OrderGiverResponse>;
  abstract updateOrderGiver(
    user: AuthUser,
    orderGiverId: string,
    body: UpdateOrderGiverForOrgBody,
  ): Promise<OrderGiverResponse>;
  abstract deleteOrderGiver(user: AuthUser, orderGiverId: string): Promise<{ deleted: true }>;
}
