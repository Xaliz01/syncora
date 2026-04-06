import type { CustomerKind, CustomerResponse } from "@syncora/shared";
import { apiRequestJson, type ApiMethod } from "./api-client";

async function customersRequest<TResponse>(
  method: ApiMethod,
  path: string,
  body?: unknown
): Promise<TResponse> {
  return apiRequestJson<TResponse>(method, path, typeof body === "undefined" ? {} : { body });
}

export interface CreateCustomerPayload {
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

export interface UpdateCustomerPayload {
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

export function listCustomers(search?: string) {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  return customersRequest<CustomerResponse[]>("GET", `/customers${qs}`);
}

export function getCustomer(customerId: string) {
  return customersRequest<CustomerResponse>("GET", `/customers/${customerId}`);
}

export function createCustomer(payload: CreateCustomerPayload) {
  return customersRequest<CustomerResponse>("POST", "/customers", payload);
}

export function updateCustomer(customerId: string, payload: UpdateCustomerPayload) {
  return customersRequest<CustomerResponse>("PATCH", `/customers/${customerId}`, payload);
}

export function deleteCustomer(customerId: string) {
  return customersRequest<{ deleted: true }>("DELETE", `/customers/${customerId}`);
}
