import type {
  AuthUser,
  CustomerResponse,
  CustomerKind,
  PostalAddress
} from "@syncora/shared";

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

export abstract class AbstractCustomersGatewayService {
  abstract createCustomer(
    user: AuthUser,
    body: CreateCustomerForOrgBody
  ): Promise<CustomerResponse>;
  abstract listCustomers(
    user: AuthUser,
    filters?: { search?: string; ids?: string }
  ): Promise<CustomerResponse[]>;
  abstract listCustomersByIds(user: AuthUser, ids: string[]): Promise<CustomerResponse[]>;
  abstract getCustomer(user: AuthUser, customerId: string): Promise<CustomerResponse>;
  abstract updateCustomer(
    user: AuthUser,
    customerId: string,
    body: UpdateCustomerForOrgBody
  ): Promise<CustomerResponse>;
  abstract deleteCustomer(user: AuthUser, customerId: string): Promise<{ deleted: true }>;
}
