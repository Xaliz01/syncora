import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { SubscriptionsService } from "../../../domain/subscriptions/subscriptions.service";
import { StripeWebhookController } from "../stripe-webhook.controller";

describe("StripeWebhookController", () => {
  const handleStripeWebhook = jest.fn();

  async function controller(): Promise<StripeWebhookController> {
    const module = await Test.createTestingModule({
      controllers: [StripeWebhookController],
      providers: [{ provide: SubscriptionsService, useValue: { handleStripeWebhook } }],
    }).compile();
    return module.get(StripeWebhookController);
  }

  beforeEach(() => {
    handleStripeWebhook.mockReset();
  });

  it("transmet le corps brut et la signature", async () => {
    const stripeWebhook = await controller();
    const rawBody = Buffer.from("stripe-payload");
    handleStripeWebhook.mockResolvedValue({ received: true });

    await expect(stripeWebhook.handleStripe({ rawBody } as never, "sig_test")).resolves.toEqual({
      received: true,
    });
    expect(handleStripeWebhook).toHaveBeenCalledWith(rawBody, "sig_test");
  });

  it("refuse un corps absent", async () => {
    const stripeWebhook = await controller();
    await expect(
      stripeWebhook.handleStripe({ rawBody: undefined } as never, "sig"),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(handleStripeWebhook).not.toHaveBeenCalled();
  });
});
