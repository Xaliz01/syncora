import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import type { CreateCustomerBody, UpdateCustomerBody } from "@syncora/shared";
import { parseOrganizationIdQuery } from "@syncora/shared/nest";
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
}
