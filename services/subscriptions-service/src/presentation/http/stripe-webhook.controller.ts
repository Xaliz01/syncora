import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req
} from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import { SubscriptionsService } from "../../domain/subscriptions.service";

@Controller("webhooks")
export class StripeWebhookController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post("stripe")
  @HttpCode(200)
  async handleStripe(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature: string | undefined
  ) {
    const raw = req.rawBody;
    if (!raw || !Buffer.isBuffer(raw)) {
      throw new BadRequestException("Raw body is required for Stripe webhooks");
    }
    return this.subscriptionsService.handleStripeWebhook(raw, signature);
  }
}
