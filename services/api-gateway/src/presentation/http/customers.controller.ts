import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AbstractCustomersGatewayService } from "../../domain/ports/customers.service.port";
import type {
  CreateCustomerForOrgBody,
  CreateCustomerSiteForOrgBody,
  UpdateCustomerForOrgBody,
  UpdateCustomerSiteForOrgBody,
} from "../../domain/ports/customers.service.port";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import {
  RequirePermissionGuard,
  RequirePermissions,
} from "../../infrastructure/require-permission.guard";
import { SubscriptionAccessGuard } from "../../infrastructure/subscription-access.guard";
import { CurrentUser } from "../../infrastructure/current-user.decorator";
import { NotifyEntity } from "../../infrastructure/notify-entity.decorator";
import type { AuthUser } from "@planwise/shared";

@Controller("customers")
@UseGuards(JwtAuthGuard, SubscriptionAccessGuard, RequirePermissionGuard)
export class CustomersController {
  constructor(private readonly customersService: AbstractCustomersGatewayService) {}

  @Post()
  @RequirePermissions("customers.create")
  @NotifyEntity({ type: "customer", labelField: "displayName" })
  async createCustomer(@CurrentUser() user: AuthUser, @Body() body: CreateCustomerForOrgBody) {
    return this.customersService.createCustomer(user, body);
  }

  @Get()
  @RequirePermissions("customers.read")
  async listCustomers(@CurrentUser() user: AuthUser, @Query("search") search?: string) {
    return this.customersService.listCustomers(user, { search });
  }

  @Get(":customerId")
  @RequirePermissions("customers.read")
  async getCustomer(@CurrentUser() user: AuthUser, @Param("customerId") customerId: string) {
    return this.customersService.getCustomer(user, customerId);
  }

  @Patch(":customerId")
  @RequirePermissions("customers.update")
  @NotifyEntity({ type: "customer", labelField: "displayName" })
  async updateCustomer(
    @CurrentUser() user: AuthUser,
    @Param("customerId") customerId: string,
    @Body() body: UpdateCustomerForOrgBody,
  ) {
    return this.customersService.updateCustomer(user, customerId, body);
  }

  @Delete(":customerId")
  @RequirePermissions("customers.delete")
  @NotifyEntity({ type: "customer", idParam: "customerId" })
  async deleteCustomer(@CurrentUser() user: AuthUser, @Param("customerId") customerId: string) {
    return this.customersService.deleteCustomer(user, customerId);
  }

  // ── Sites ──

  @Post(":customerId/sites")
  @RequirePermissions("customers.update")
  async createSite(
    @CurrentUser() user: AuthUser,
    @Param("customerId") customerId: string,
    @Body() body: CreateCustomerSiteForOrgBody,
  ) {
    return this.customersService.createSite(user, customerId, body);
  }

  @Patch(":customerId/sites/:siteId")
  @RequirePermissions("customers.update")
  async updateSite(
    @CurrentUser() user: AuthUser,
    @Param("customerId") customerId: string,
    @Param("siteId") siteId: string,
    @Body() body: UpdateCustomerSiteForOrgBody,
  ) {
    return this.customersService.updateSite(user, customerId, siteId, body);
  }

  @Delete(":customerId/sites/:siteId")
  @RequirePermissions("customers.update")
  async deleteSite(
    @CurrentUser() user: AuthUser,
    @Param("customerId") customerId: string,
    @Param("siteId") siteId: string,
  ) {
    return this.customersService.deleteSite(user, customerId, siteId);
  }
}
