import type {
  CreateCustomerBody,
  CreateCustomerContactBody,
  CreateCustomerSiteBody,
  CustomerContactResponse,
  CustomerResponse,
  CustomerSiteResponse,
  CustomersListResponse,
  UpdateCustomerBody,
  UpdateCustomerContactBody,
  UpdateCustomerSiteBody,
} from "@planwise/shared";

export abstract class AbstractCustomersService {
  abstract createCustomer(body: CreateCustomerBody): Promise<CustomerResponse>;
  abstract listCustomers(
    organizationId: string,
    filters?: { search?: string; ids?: string[]; limit?: number; offset?: number },
  ): Promise<CustomersListResponse>;
  abstract getCustomer(id: string, organizationId: string): Promise<CustomerResponse>;
  abstract updateCustomer(id: string, body: UpdateCustomerBody): Promise<CustomerResponse>;
  abstract deleteCustomer(id: string, organizationId: string): Promise<{ deleted: true }>;
  abstract purgeTestData(organizationId: string): Promise<{ purged: true }>;

  abstract createSite(
    customerId: string,
    body: CreateCustomerSiteBody,
  ): Promise<CustomerSiteResponse>;
  abstract updateSite(
    customerId: string,
    siteId: string,
    body: UpdateCustomerSiteBody,
  ): Promise<CustomerSiteResponse>;
  abstract deleteSite(
    customerId: string,
    siteId: string,
    organizationId: string,
  ): Promise<{ deleted: true }>;

  abstract createContact(
    customerId: string,
    body: CreateCustomerContactBody,
  ): Promise<CustomerContactResponse>;
  abstract updateContact(
    customerId: string,
    contactId: string,
    body: UpdateCustomerContactBody,
  ): Promise<CustomerContactResponse>;
  abstract deleteContact(
    customerId: string,
    contactId: string,
    organizationId: string,
  ): Promise<{ deleted: true }>;
}
