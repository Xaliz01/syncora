import { BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import type { AuthUser } from "@planwise/shared";
import { SubscriptionsGatewayService } from "../subscriptions.gateway.service";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";
import { AbstractDocumentsService } from "../documents/ports/documents.service.port";
import { AbstractOrganizationsService } from "../organizations/ports/organizations.service.port";

describe("SubscriptionsGatewayService", () => {
  let service: SubscriptionsGatewayService;
  let subscriptions: { createCheckoutSession: jest.Mock };
  let organizations: { findById: jest.Mock };

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
    subscriptions = {
      createCheckoutSession: jest.fn().mockResolvedValue({
        url: "https://checkout.stripe.test/session",
      }),
    };
    organizations = { findById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsGatewayService,
        { provide: SubscriptionsService, useValue: subscriptions },
        {
          provide: AbstractDocumentsService,
          useValue: { getOrganizationStorageUsage: jest.fn() },
        },
        { provide: AbstractOrganizationsService, useValue: organizations },
      ],
    }).compile();

    service = module.get(SubscriptionsGatewayService);
  });

  describe("createCheckoutSession", () => {
    it("sends organization billing email to Stripe checkout (not user email)", async () => {
      organizations.findById.mockResolvedValue({
        id: "org-1",
        name: "Acme",
        email: "facturation@acme.fr",
      });

      const result = await service.createCheckoutSession(user, {
        customerEmail: "user@example.com",
        successUrl: "https://app.test/ok",
        cancelUrl: "https://app.test/cancel",
      });

      expect(result).toEqual({ url: "https://checkout.stripe.test/session" });
      expect(subscriptions.createCheckoutSession).toHaveBeenCalledWith({
        organizationId: "org-1",
        customerEmail: "facturation@acme.fr",
        successUrl: "https://app.test/ok",
        cancelUrl: "https://app.test/cancel",
      });
    });

    it("rejects checkout when organization has no billing email", async () => {
      organizations.findById.mockResolvedValue({
        id: "org-1",
        name: "Acme",
        email: "",
      });

      await expect(
        service.createCheckoutSession(user, {
          successUrl: "https://app.test/ok",
          cancelUrl: "https://app.test/cancel",
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(subscriptions.createCheckoutSession).not.toHaveBeenCalled();
    });
  });
});
