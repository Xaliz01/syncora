import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import type {
  CreateCustomerBody,
  CreateCustomerContactBody,
  CreateCustomerSiteBody,
  UpdateCustomerBody,
  UpdateCustomerContactBody,
  UpdateCustomerSiteBody,
} from "@planwise/shared";
import { parseOrganizationIdQuery } from "@planwise/shared/nest";
import { AbstractCustomersService } from "../../domain/ports/customers.service.port";

@Controller("customers")
export class CustomersController {
  constructor(private readonly customersService: AbstractCustomersService) {}

  @Post()
  async createCustomer(@Body() body: CreateCustomerBody) {
    return this.customersService.createCustomer(body);
  }

  @Get()
  async listCustomers(
    @Query("organizationId") organizationId: string,
    @Query("search") search?: string,
    @Query("ids") idsCsv?: string,
  ) {
    const orgId = parseOrganizationIdQuery(organizationId);
    const ids = idsCsv
      ? idsCsv
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;
    return this.customersService.listCustomers(orgId, {
      search,
      ids: ids?.length ? ids : undefined,
    });
  }

  @Get(":id")
  async getCustomer(@Param("id") id: string, @Query("organizationId") organizationId: string) {
    return this.customersService.getCustomer(id, parseOrganizationIdQuery(organizationId));
  }

  @Patch(":id")
  async updateCustomer(@Param("id") id: string, @Body() body: UpdateCustomerBody) {
    return this.customersService.updateCustomer(id, body);
  }

  @Delete(":id")
  async deleteCustomer(@Param("id") id: string, @Query("organizationId") organizationId: string) {
    return this.customersService.deleteCustomer(id, parseOrganizationIdQuery(organizationId));
  }

  // ── Sites ──

  @Post(":id/sites")
  async createSite(@Param("id") id: string, @Body() body: CreateCustomerSiteBody) {
    return this.customersService.createSite(id, body);
  }

  @Patch(":id/sites/:siteId")
  async updateSite(
    @Param("id") id: string,
    @Param("siteId") siteId: string,
    @Body() body: UpdateCustomerSiteBody,
  ) {
    return this.customersService.updateSite(id, siteId, body);
  }

  @Delete(":id/sites/:siteId")
  async deleteSite(
    @Param("id") id: string,
    @Param("siteId") siteId: string,
    @Query("organizationId") organizationId: string,
  ) {
    return this.customersService.deleteSite(id, siteId, parseOrganizationIdQuery(organizationId));
  }

  // ── Contacts ──

  @Post(":id/contacts")
  async createContact(@Param("id") id: string, @Body() body: CreateCustomerContactBody) {
    return this.customersService.createContact(id, body);
  }

  @Patch(":id/contacts/:contactId")
  async updateContact(
    @Param("id") id: string,
    @Param("contactId") contactId: string,
    @Body() body: UpdateCustomerContactBody,
  ) {
    return this.customersService.updateContact(id, contactId, body);
  }

  @Delete(":id/contacts/:contactId")
  async deleteContact(
    @Param("id") id: string,
    @Param("contactId") contactId: string,
    @Query("organizationId") organizationId: string,
  ) {
    return this.customersService.deleteContact(
      id,
      contactId,
      parseOrganizationIdQuery(organizationId),
    );
  }
}
