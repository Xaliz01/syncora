import { Test, TestingModule } from "@nestjs/testing";
import { SubscriptionsController } from "../subscriptions.controller";
import { AbstractSubscriptionsGatewayService } from "../../../domain/ports/subscriptions.service.port";
import { JwtAuthGuard } from "../../../infrastructure/jwt-auth.guard";
import { RequirePermissionGuard } from "../../../infrastructure/require-permission.guard";
import { SubscriptionAccessGuard } from "../../../infrastructure/subscription-access.guard";
import type { AddonCode, AuthUser } from "@syncora/shared";

describe("SubscriptionsController", () => {
  let controller: SubscriptionsController;
  let mockSubscriptionsService: jest.Mocked<AbstractSubscriptionsGatewayService>;

  const mockUser: AuthUser = {
    id: "user-123",
    email: "admin@example.com",
    organizationId: "org-123",
    role: "admin",
    status: "active",
    permissions: [],
    name: "Admin User",
  };

  beforeEach(async () => {
    mockSubscriptionsService = {
      getCurrentSubscription: jest.fn(),
      createCheckoutSession: jest.fn(),
      createAddonCheckoutSession: jest.fn(),
      createBillingPortalSession: jest.fn(),
      updateSubscriptionAddons: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionsController],
      providers: [
        {
          provide: AbstractSubscriptionsGatewayService,
          useValue: mockSubscriptionsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(SubscriptionAccessGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RequirePermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SubscriptionsController>(SubscriptionsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getCurrent", () => {
    it("should call subscriptionsService.getCurrentSubscription with user", () => {
      const expected = { planId: "pro", status: "active" };
      mockSubscriptionsService.getCurrentSubscription.mockResolvedValue(expected as never);

      const result = controller.getCurrent(mockUser);

      expect(mockSubscriptionsService.getCurrentSubscription).toHaveBeenCalledWith(mockUser);
      expect(result).resolves.toEqual(expected);
    });
  });

  describe("createCheckoutSession", () => {
    it("should call subscriptionsService.createCheckoutSession with user and body", () => {
      const body = {
        planId: "pro",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      };
      const expected = { sessionUrl: "https://checkout.stripe.com/session-1" };
      mockSubscriptionsService.createCheckoutSession.mockResolvedValue(expected as never);

      const result = controller.createCheckoutSession(mockUser, body);

      expect(mockSubscriptionsService.createCheckoutSession).toHaveBeenCalledWith(mockUser, body);
      expect(result).resolves.toEqual(expected);
    });
  });

  describe("createAddonCheckoutSession", () => {
    it("should call subscriptionsService.createAddonCheckoutSession with user and body", () => {
      const body = {
        addonCode: "team_suggestion" as const,
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      };
      const expected = { url: "https://checkout.stripe.com/addon-session-1" };
      mockSubscriptionsService.createAddonCheckoutSession.mockResolvedValue(expected as never);

      const result = controller.createAddonCheckoutSession(mockUser, body);

      expect(mockSubscriptionsService.createAddonCheckoutSession).toHaveBeenCalledWith(
        mockUser,
        body,
      );
      expect(result).resolves.toEqual(expected);
    });
  });

  describe("createBillingPortal", () => {
    it("should call subscriptionsService.createBillingPortalSession with user and body", () => {
      const body = { returnUrl: "https://example.com/settings" };
      const expected = { url: "https://billing.stripe.com/portal-1" };
      mockSubscriptionsService.createBillingPortalSession.mockResolvedValue(expected as never);

      const result = controller.createBillingPortal(mockUser, body);

      expect(mockSubscriptionsService.createBillingPortalSession).toHaveBeenCalledWith(
        mockUser,
        body,
      );
      expect(result).resolves.toEqual(expected);
    });
  });

  describe("updateSubscriptionAddons", () => {
    it("should call subscriptionsService.updateSubscriptionAddons with user and body", () => {
      const body = {
        addonCodes: ["team_suggestion"] satisfies AddonCode[],
        successUrl: "https://example.com/subscription?checkout=success",
      };
      const expected = { url: null };
      mockSubscriptionsService.updateSubscriptionAddons.mockResolvedValue(expected as never);

      const result = controller.updateSubscriptionAddons(mockUser, body);

      expect(mockSubscriptionsService.updateSubscriptionAddons).toHaveBeenCalledWith(mockUser, body);
      expect(result).resolves.toEqual(expected);
    });
  });
});
