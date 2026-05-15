import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { StripeWebhookController } from "../stripe-webhook.controller";
import { SubscriptionsService } from "../../../domain/subscriptions.service";

describe("StripeWebhookController", () => {
  let controller: StripeWebhookController;
  let mockSubscriptionsService: {
    handleStripeWebhook: jest.Mock;
  };

  beforeEach(async () => {
    mockSubscriptionsService = {
      handleStripeWebhook: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StripeWebhookController],
      providers: [
        {
          provide: SubscriptionsService,
          useValue: mockSubscriptionsService,
        },
      ],
    }).compile();

    controller = module.get<StripeWebhookController>(StripeWebhookController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("handleStripe", () => {
    it("should call service with rawBody and signature", async () => {
      const rawBody = Buffer.from("stripe-payload");
      const signature = "sig_test_123";
      const req = { rawBody } as never;

      mockSubscriptionsService.handleStripeWebhook.mockResolvedValue({ received: true });

      const result = await controller.handleStripe(req, signature);

      expect(mockSubscriptionsService.handleStripeWebhook).toHaveBeenCalledWith(
        rawBody,
        signature,
      );
      expect(result).toEqual({ received: true });
    });

    it("should throw BadRequestException when rawBody is missing", async () => {
      const req = { rawBody: undefined } as never;

      await expect(controller.handleStripe(req, "sig_test_123")).rejects.toThrow(
        BadRequestException,
      );
      expect(mockSubscriptionsService.handleStripeWebhook).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException when rawBody is not a Buffer", async () => {
      const req = { rawBody: "not-a-buffer" } as never;

      await expect(controller.handleStripe(req, "sig_test_123")).rejects.toThrow(
        BadRequestException,
      );
      expect(mockSubscriptionsService.handleStripeWebhook).not.toHaveBeenCalled();
    });
  });
});
