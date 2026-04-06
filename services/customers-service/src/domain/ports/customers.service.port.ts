import type {
  CreateCustomerBody,
  CustomerResponse,
  UpdateCustomerBody
} from "@syncora/shared";

export abstract class AbstractCustomersService {
  abstract createCustomer(body: CreateCustomerBody): Promise<CustomerResponse>;
  abstract listCustomers(
    organizationId: string,
    filters?: { search?: string; ids?: string[] }
  ): Promise<CustomerResponse[]>;
  abstract getCustomer(id: string, organizationId: string): Promise<CustomerResponse>;
  abstract updateCustomer(id: string, body: UpdateCustomerBody): Promise<CustomerResponse>;
  abstract deleteCustomer(id: string, organizationId: string): Promise<{ deleted: true }>;
}
