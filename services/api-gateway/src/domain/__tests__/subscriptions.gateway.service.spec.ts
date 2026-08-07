import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { HttpService } from "@nestjs/axios";
import { of } from "rxjs";
import type { AuthUser } from "@planwise/shared";
import { SubscriptionsGatewayService } from "../subscriptions.gateway.service";

describe("SubscriptionsGatewayService", () => {
  let service: SubscriptionsGatewayService;
  let httpService: { get: jest.Mock; request: jest.Mock };

  const user: AuthUser = {
    id: "user-1",
    email: "user@example.com",
    organizationId: "org-1",
    role: "admin",
    status: "active",
    permissions: [],
    name: "Admin",
  };

  beforeEach(async () => {
    httpService = {
      get: jest.fn(),
      request: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SubscriptionsGatewayService, { provide: HttpService, useValue: httpService }],
    }).compile();

    service = module.get(SubscriptionsGatewayService);
  });

  describe("createCheckoutSession", () => {
    it("sends organization billing email to Stripe checkout (not user email)", async () => {
      httpService.get.mockReturnValue(
        of({
          data: {
            id: "org-1",
            name: "Acme",
            email: "facturation@acme.fr",
          },
        }),
      );
      httpService.request.mockReturnValue(
        of({ data: { url: "https://checkout.stripe.test/session" } }),
      );

      const result = await service.createCheckoutSession(user, {
        customerEmail: "user@example.com",
        successUrl: "https://app.test/ok",
        cancelUrl: "https://app.test/cancel",
      });

      expect(result).toEqual({ url: "https://checkout.stripe.test/session" });
      expect(httpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "post",
          data: {
            organizationId: "org-1",
            customerEmail: "facturation@acme.fr",
            successUrl: "https://app.test/ok",
            cancelUrl: "https://app.test/cancel",
          },
        }),
      );
    });

    it("rejects checkout when organization has no billing email", async () => {
      httpService.get.mockReturnValue(
        of({
          data: {
            id: "org-1",
            name: "Acme",
            email: "",
          },
        }),
      );

      await expect(
        service.createCheckoutSession(user, {
          successUrl: "https://app.test/ok",
          cancelUrl: "https://app.test/cancel",
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(httpService.request).not.toHaveBeenCalled();
    });
  });
});
