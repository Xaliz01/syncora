import { Injectable } from "@nestjs/common";
import type {
  AuthUser,
  CreateCustomerBody,
  CreateCustomerContactBody,
  CreateCustomerSiteBody,
  UpdateCustomerBody,
  UpdateCustomerContactBody,
  UpdateCustomerSiteBody,
} from "@planwise/shared";
import {
  AbstractCustomersGatewayService,
  type CreateCustomerContactForOrgBody,
  type CreateCustomerForOrgBody,
  type CreateCustomerSiteForOrgBody,
  type UpdateCustomerContactForOrgBody,
  type UpdateCustomerForOrgBody,
  type UpdateCustomerSiteForOrgBody,
} from "./ports/customers.service.port";
import { AbstractCustomersService } from "./customers/ports/customers.service.port";

function parseIds(ids?: string): string[] | undefined {
  if (!ids?.trim()) return undefined;
  return ids
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

@Injectable()
export class CustomersGatewayService extends AbstractCustomersGatewayService {
  constructor(private readonly customersService: AbstractCustomersService) {
    super();
  }

  async createCustomer(user: AuthUser, body: CreateCustomerForOrgBody) {
    return this.customersService.createCustomer({
      ...body,
      organizationId: user.organizationId,
    } as CreateCustomerBody);
  }

  async listCustomers(
    user: AuthUser,
    filters?: { search?: string; ids?: string; limit?: number; offset?: number },
  ) {
    return this.customersService.listCustomers(user.organizationId, {
      search: filters?.search,
      ids: parseIds(filters?.ids),
      limit: filters?.limit,
      offset: filters?.offset,
    });
  }

  async listCustomersByIds(user: AuthUser, ids: string[]) {
    const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))].slice(0, 100);
    if (unique.length === 0) return [];
    const response = await this.customersService.listCustomers(user.organizationId, {
      ids: unique,
    });
    return response.customers;
  }

  async getCustomer(user: AuthUser, customerId: string) {
    return this.customersService.getCustomer(customerId, user.organizationId);
  }

  async updateCustomer(user: AuthUser, customerId: string, body: UpdateCustomerForOrgBody) {
    return this.customersService.updateCustomer(customerId, {
      ...body,
      organizationId: user.organizationId,
    } as UpdateCustomerBody);
  }

  async deleteCustomer(user: AuthUser, customerId: string) {
    return this.customersService.deleteCustomer(customerId, user.organizationId);
  }

  async createSite(user: AuthUser, customerId: string, body: CreateCustomerSiteForOrgBody) {
    return this.customersService.createSite(customerId, {
      ...body,
      organizationId: user.organizationId,
    } as CreateCustomerSiteBody);
  }

  async updateSite(
    user: AuthUser,
    customerId: string,
    siteId: string,
    body: UpdateCustomerSiteForOrgBody,
  ) {
    return this.customersService.updateSite(customerId, siteId, {
      ...body,
      organizationId: user.organizationId,
    } as UpdateCustomerSiteBody);
  }

  async deleteSite(user: AuthUser, customerId: string, siteId: string) {
    return this.customersService.deleteSite(customerId, siteId, user.organizationId);
  }

  async createContact(user: AuthUser, customerId: string, body: CreateCustomerContactForOrgBody) {
    return this.customersService.createContact(customerId, {
      ...body,
      organizationId: user.organizationId,
    } as CreateCustomerContactBody);
  }

  async updateContact(
    user: AuthUser,
    customerId: string,
    contactId: string,
    body: UpdateCustomerContactForOrgBody,
  ) {
    return this.customersService.updateContact(customerId, contactId, {
      ...body,
      organizationId: user.organizationId,
    } as UpdateCustomerContactBody);
  }

  async deleteContact(user: AuthUser, customerId: string, contactId: string) {
    return this.customersService.deleteContact(customerId, contactId, user.organizationId);
  }
}
