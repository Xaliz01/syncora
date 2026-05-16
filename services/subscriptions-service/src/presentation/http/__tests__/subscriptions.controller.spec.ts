import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { SubscriptionsController } from "../subscriptions.controller";
import { SubscriptionsService } from "../../../domain/subscriptions.service";

describe("SubscriptionsController", () => {
  let controller: SubscriptionsController;
  let mockSubscriptionsService: {
    getByOrganization: jest.Mock;
    createCheckoutSession: jest.Mock;
    createAddonCheckoutSession: jest.Mock;
    createBillingPortalSession: jest.Mock;
  };

  beforeEach(async () => {
    mockSubscriptionsService = {
      getByOrganization: jest.fn(),
      createCheckoutSession: jest.fn(),
      createAddonCheckoutSession: jest.fn(),
      createBillingPortalSession: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionsController],
      providers: [
        {
          provide: SubscriptionsService,
          useValue: mockSubscriptionsService,
        },
      ],
    }).compile();

    controller = module.get<SubscriptionsController>(SubscriptionsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getCurrent", () => {
    it("should delegate to service.getByOrganization", async () => {
      const response = {
        organizationId: "org-1",
        status: "active",
        hasAccess: true,
      };
      mockSubscriptionsService.getByOrganization.mockResolvedValue(response);

      const result = await controller.getCurrent("org-1");

      expect(mockSubscriptionsService.getByOrganization).toHaveBeenCalledWith("org-1");
      expect(result).toEqual(response);
    });

    it("should throw BadRequestException when organizationId is missing", () => {
      expect(() => controller.getCurrent(undefined as never)).toThrow(BadRequestException);
      expect(mockSubscriptionsService.getByOrganization).not.toHaveBeenCalled();
    });
  });

  describe("createCheckoutSession", () => {
    it("should delegate to service.createCheckoutSession", async () => {
      const body = {
        organizationId: "org-1",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      };
      mockSubscriptionsService.createCheckoutSession.mockResolvedValue({
        url: "https://checkout.stripe.com/session",
      });

      const result = await controller.createCheckoutSession(body);

      expect(mockSubscriptionsService.createCheckoutSession).toHaveBeenCalledWith({
        organizationId: "org-1",
        customerEmail: undefined,
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      });
      expect(result.url).toBe("https://checkout.stripe.com/session");
    });

    it("should throw BadRequestException when organizationId is missing", () => {
      const body = {
        organizationId: "",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      };

      expect(() => controller.createCheckoutSession(body)).toThrow(BadRequestException);
      expect(mockSubscriptionsService.createCheckoutSession).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException when successUrl is missing", () => {
      const body = {
        organizationId: "org-1",
        successUrl: "",
        cancelUrl: "https://example.com/cancel",
      };

      expect(() => controller.createCheckoutSession(body)).toThrow(BadRequestException);
      expect(mockSubscriptionsService.createCheckoutSession).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException when cancelUrl is missing", () => {
      const body = {
        organizationId: "org-1",
        successUrl: "https://example.com/success",
        cancelUrl: "",
      };

      expect(() => controller.createCheckoutSession(body)).toThrow(BadRequestException);
      expect(mockSubscriptionsService.createCheckoutSession).not.toHaveBeenCalled();
    });
  });

  describe("createAddonCheckoutSession", () => {
    it("should delegate to service.createAddonCheckoutSession", async () => {
      const body = {
        organizationId: "org-1",
        addonCode: "team_suggestion" as const,
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      };
      mockSubscriptionsService.createAddonCheckoutSession.mockResolvedValue({
        url: "https://checkout.stripe.com/addon-session",
      });

      const result = await controller.createAddonCheckoutSession(body);

      expect(mockSubscriptionsService.createAddonCheckoutSession).toHaveBeenCalledWith({
        organizationId: "org-1",
        addonCode: "team_suggestion",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      });
      expect(result.url).toBe("https://checkout.stripe.com/addon-session");
    });

    it("should throw BadRequestException when organizationId is missing", () => {
      const body = {
        organizationId: "",
        addonCode: "team_suggestion" as const,
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      };

      expect(() => controller.createAddonCheckoutSession(body)).toThrow(BadRequestException);
      expect(mockSubscriptionsService.createAddonCheckoutSession).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException when addonCode is invalid", () => {
      const body = {
        organizationId: "org-1",
        addonCode: "invalid_addon" as never,
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      };

      expect(() => controller.createAddonCheckoutSession(body)).toThrow(BadRequestException);
      expect(mockSubscriptionsService.createAddonCheckoutSession).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException when successUrl is missing", () => {
      const body = {
        organizationId: "org-1",
        addonCode: "team_suggestion" as const,
        successUrl: "",
        cancelUrl: "https://example.com/cancel",
      };

      expect(() => controller.createAddonCheckoutSession(body)).toThrow(BadRequestException);
      expect(mockSubscriptionsService.createAddonCheckoutSession).not.toHaveBeenCalled();
    });
  });

  describe("createBillingPortal", () => {
    it("should delegate to service.createBillingPortalSession", async () => {
      const body = {
        organizationId: "org-1",
        returnUrl: "https://example.com/settings",
      };
      mockSubscriptionsService.createBillingPortalSession.mockResolvedValue({
        url: "https://billing.stripe.com/session",
      });

      const result = await controller.createBillingPortal(body);

      expect(mockSubscriptionsService.createBillingPortalSession).toHaveBeenCalledWith({
        organizationId: "org-1",
        returnUrl: "https://example.com/settings",
      });
      expect(result.url).toBe("https://billing.stripe.com/session");
    });

    it("should throw BadRequestException when organizationId is missing", () => {
      const body = {
        organizationId: "",
        returnUrl: "https://example.com/settings",
      };

      expect(() => controller.createBillingPortal(body)).toThrow(BadRequestException);
      expect(mockSubscriptionsService.createBillingPortalSession).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException when returnUrl is missing", () => {
      const body = {
        organizationId: "org-1",
        returnUrl: "",
      };

      expect(() => controller.createBillingPortal(body)).toThrow(BadRequestException);
      expect(mockSubscriptionsService.createBillingPortalSession).not.toHaveBeenCalled();
    });
  });
});
