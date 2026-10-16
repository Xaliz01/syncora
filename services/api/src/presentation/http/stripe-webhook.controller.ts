import { BadRequestException, Controller, Headers, HttpCode, Post, Req } from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import type { Request } from "express";
import { SubscriptionsService } from "../../domain/subscriptions/subscriptions.service";

/** Webhook Stripe public (hors préfixe /api), signature vérifiée sur le corps brut. */
@Controller("webhooks")
export class StripeWebhookController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post("stripe")
  @HttpCode(200)
  async handleStripe(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature: string | undefined,
  ) {
    const raw = req.rawBody;
    if (!raw || !Buffer.isBuffer(raw)) {
      throw new BadRequestException("Corps brut requis pour le webhook Stripe");
    }
    return this.subscriptionsService.handleStripeWebhook(raw, signature);
  }
}
