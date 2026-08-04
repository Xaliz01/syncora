import type { CustomerKind, OrderGiverResponse, OrderGiversListResponse } from "@planwise/shared";
import { apiRequestJson, type ApiMethod } from "./api-client";

async function orderGiversRequest<TResponse>(
  method: ApiMethod,
  path: string,
  body?: unknown,
): Promise<TResponse> {
  return apiRequestJson<TResponse>(method, path, typeof body === "undefined" ? {} : { body });
}

export interface CreateOrderGiverPayload {
  kind: CustomerKind;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  legalIdentifier?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: {
    line1: string;
    line2?: string;
    postalCode: string;
    city: string;
    country: string;
  };
  notes?: string;
}

export interface UpdateOrderGiverPayload {
  kind?: CustomerKind;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  legalIdentifier?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  address?: {
    line1: string;
    line2?: string;
    postalCode: string;
    city: string;
    country: string;
  } | null;
  notes?: string | null;
}

export function listOrderGivers(filters?: { search?: string; limit?: number; offset?: number }) {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.limit != null) params.set("limit", String(filters.limit));
  if (filters?.offset != null) params.set("offset", String(filters.offset));
  const qs = params.toString();
  return orderGiversRequest<OrderGiversListResponse>("GET", `/order-givers${qs ? `?${qs}` : ""}`);
}

export function getOrderGiver(orderGiverId: string) {
  return orderGiversRequest<OrderGiverResponse>("GET", `/order-givers/${orderGiverId}`);
}

export function createOrderGiver(payload: CreateOrderGiverPayload) {
  return orderGiversRequest<OrderGiverResponse>("POST", "/order-givers", payload);
}

export function updateOrderGiver(orderGiverId: string, payload: UpdateOrderGiverPayload) {
  return orderGiversRequest<OrderGiverResponse>("PATCH", `/order-givers/${orderGiverId}`, payload);
}

export function deleteOrderGiver(orderGiverId: string) {
  return orderGiversRequest<{ deleted: true }>("DELETE", `/order-givers/${orderGiverId}`);
}
