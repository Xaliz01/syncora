import type {
  CustomerContactResponse,
  CustomerKind,
  CustomerResponse,
  CustomersListResponse,
  CustomerSiteResponse,
  PostalAddress,
} from "@planwise/shared";
import { apiRequestJson, type ApiMethod } from "./api-client";

async function customersRequest<TResponse>(
  method: ApiMethod,
  path: string,
  body?: unknown,
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

export function listCustomers(filters?: { search?: string; limit?: number; offset?: number }) {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.limit != null) params.set("limit", String(filters.limit));
  if (filters?.offset != null) params.set("offset", String(filters.offset));
  const qs = params.toString();
  return customersRequest<CustomersListResponse>("GET", `/customers${qs ? `?${qs}` : ""}`);
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

// ── Sites ──

export interface CreateCustomerSitePayload {
  label: string;
  address: PostalAddress;
  isDefault?: boolean;
  notes?: string;
}

export interface UpdateCustomerSitePayload {
  label?: string;
  address?: PostalAddress;
  isDefault?: boolean;
  notes?: string | null;
}

export function createCustomerSite(customerId: string, payload: CreateCustomerSitePayload) {
  return customersRequest<CustomerSiteResponse>("POST", `/customers/${customerId}/sites`, payload);
}

export function updateCustomerSite(
  customerId: string,
  siteId: string,
  payload: UpdateCustomerSitePayload,
) {
  return customersRequest<CustomerSiteResponse>(
    "PATCH",
    `/customers/${customerId}/sites/${siteId}`,
    payload,
  );
}

export function deleteCustomerSite(customerId: string, siteId: string) {
  return customersRequest<{ deleted: true }>("DELETE", `/customers/${customerId}/sites/${siteId}`);
}

// ── Contacts ──

export interface CreateCustomerContactPayload {
  name: string;
  role?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  notes?: string;
}

export interface UpdateCustomerContactPayload {
  name?: string;
  role?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  notes?: string | null;
}

export function createCustomerContact(customerId: string, payload: CreateCustomerContactPayload) {
  return customersRequest<CustomerContactResponse>(
    "POST",
    `/customers/${customerId}/contacts`,
    payload,
  );
}

export function updateCustomerContact(
  customerId: string,
  contactId: string,
  payload: UpdateCustomerContactPayload,
) {
  return customersRequest<CustomerContactResponse>(
    "PATCH",
    `/customers/${customerId}/contacts/${contactId}`,
    payload,
  );
}

export function deleteCustomerContact(customerId: string, contactId: string) {
  return customersRequest<{ deleted: true }>(
    "DELETE",
    `/customers/${customerId}/contacts/${contactId}`,
  );
}
