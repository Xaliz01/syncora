import { BadRequestException, Body, Controller, Get, Post, Query } from "@nestjs/common";
import { SubscriptionsService } from "../../domain/subscriptions.service";
import type { CreateBillingPortalBody, CreateCheckoutSessionBody } from "@syncora/shared";

@Controller("subscriptions")
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get("current")
  getCurrent(@Query("organizationId") organizationId: string) {
    this.ensureOrg(organizationId);
    return this.subscriptionsService.getByOrganization(organizationId);
  }

  @Post("checkout-session")
  createCheckoutSession(@Body() body: CreateCheckoutSessionBody) {
    this.ensureOrg(body.organizationId);
    if (!body.successUrl?.trim() || !body.cancelUrl?.trim()) {
      throw new BadRequestException("successUrl and cancelUrl are required");
    }
    return this.subscriptionsService.createCheckoutSession({
      organizationId: body.organizationId,
      customerEmail: body.customerEmail,
      successUrl: body.successUrl.trim(),
      cancelUrl: body.cancelUrl.trim(),
    });
  }

  @Post("billing-portal")
  createBillingPortal(@Body() body: CreateBillingPortalBody) {
    this.ensureOrg(body.organizationId);
    if (!body.returnUrl?.trim()) {
      throw new BadRequestException("returnUrl is required");
    }
    return this.subscriptionsService.createBillingPortalSession({
      organizationId: body.organizationId,
      returnUrl: body.returnUrl.trim(),
    });
  }

  private ensureOrg(organizationId: string | undefined): asserts organizationId is string {
    if (!organizationId?.trim()) {
      throw new BadRequestException("organizationId is required");
    }
  }
}
