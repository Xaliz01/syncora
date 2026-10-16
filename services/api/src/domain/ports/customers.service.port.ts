import type {
  AuthUser,
  CustomerContactResponse,
  CustomerResponse,
  CustomerSiteResponse,
  CustomersListResponse,
  CustomerKind,
  PostalAddress,
} from "@planwise/shared";

export interface CreateCustomerForOrgBody {
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

export interface UpdateCustomerForOrgBody {
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

export interface CreateCustomerSiteForOrgBody {
  label: string;
  address: PostalAddress;
  isDefault?: boolean;
  notes?: string;
}

export interface UpdateCustomerSiteForOrgBody {
  label?: string;
  address?: PostalAddress;
  isDefault?: boolean;
  notes?: string | null;
}

export interface CreateCustomerContactForOrgBody {
  name: string;
  role?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  notes?: string;
}

export interface UpdateCustomerContactForOrgBody {
  name?: string;
  role?: string | null;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  notes?: string | null;
}

export abstract class AbstractCustomersGatewayService {
  abstract createCustomer(
    user: AuthUser,
    body: CreateCustomerForOrgBody,
  ): Promise<CustomerResponse>;
  abstract listCustomers(
    user: AuthUser,
    filters?: { search?: string; ids?: string; limit?: number; offset?: number },
  ): Promise<CustomersListResponse>;
  abstract listCustomersByIds(user: AuthUser, ids: string[]): Promise<CustomerResponse[]>;
  abstract getCustomer(user: AuthUser, customerId: string): Promise<CustomerResponse>;
  abstract updateCustomer(
    user: AuthUser,
    customerId: string,
    body: UpdateCustomerForOrgBody,
  ): Promise<CustomerResponse>;
  abstract deleteCustomer(user: AuthUser, customerId: string): Promise<{ deleted: true }>;

  abstract createSite(
    user: AuthUser,
    customerId: string,
    body: CreateCustomerSiteForOrgBody,
  ): Promise<CustomerSiteResponse>;
  abstract updateSite(
    user: AuthUser,
    customerId: string,
    siteId: string,
    body: UpdateCustomerSiteForOrgBody,
  ): Promise<CustomerSiteResponse>;
  abstract deleteSite(
    user: AuthUser,
    customerId: string,
    siteId: string,
  ): Promise<{ deleted: true }>;

  abstract createContact(
    user: AuthUser,
    customerId: string,
    body: CreateCustomerContactForOrgBody,
  ): Promise<CustomerContactResponse>;
  abstract updateContact(
    user: AuthUser,
    customerId: string,
    contactId: string,
    body: UpdateCustomerContactForOrgBody,
  ): Promise<CustomerContactResponse>;
  abstract deleteContact(
    user: AuthUser,
    customerId: string,
    contactId: string,
  ): Promise<{ deleted: true }>;
}
