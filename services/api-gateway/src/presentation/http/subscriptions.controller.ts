import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { AbstractSubscriptionsGatewayService } from "../../domain/ports/subscriptions.service.port";
import { JwtAuthGuard } from "../../infrastructure/jwt-auth.guard";
import { RequirePermissionGuard, RequirePermissions } from "../../infrastructure/require-permission.guard";
import { CurrentUser } from "../../infrastructure/current-user.decorator";
import type {
  AuthUser,
  CreateBillingPortalGatewayBody,
  CreateCheckoutSessionGatewayBody
} from "@syncora/shared";

@Controller("subscriptions")
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: AbstractSubscriptionsGatewayService) {}

  @Get("current")
  getCurrent(@CurrentUser() user: AuthUser) {
    return this.subscriptionsService.getCurrentSubscription(user);
  }

  @Post("checkout-session")
  @UseGuards(RequirePermissionGuard)
  @RequirePermissions("subscriptions.manage_billing")
  createCheckoutSession(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateCheckoutSessionGatewayBody
  ) {
    return this.subscriptionsService.createCheckoutSession(user, body);
  }

  @Post("billing-portal")
  @UseGuards(RequirePermissionGuard)
  @RequirePermissions("subscriptions.manage_billing")
  createBillingPortal(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateBillingPortalGatewayBody
  ) {
    return this.subscriptionsService.createBillingPortalSession(user, body);
  }
}
