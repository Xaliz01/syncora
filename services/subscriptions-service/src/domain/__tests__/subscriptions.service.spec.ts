import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { SubscriptionsService } from "../subscriptions.service";

describe("SubscriptionsService", () => {
  let service: SubscriptionsService;
  let mockSubscriptionModel: {
    findOne: jest.Mock;
  };
  let mockProcessedEventModel: Record<string, jest.Mock>;

  const mockSubscriptionDoc = (overrides: Record<string, unknown> = {}) => ({
    organizationId: "org-1",
    stripeCustomerId: "cus_123",
    stripeSubscriptionId: "sub_123",
    stripeStatus: "active",
    trialEndsAt: new Date("2025-02-01"),
    currentPeriodEnd: new Date("2025-03-01"),
    cancelAtPeriodEnd: false,
    ...overrides,
  });

  beforeEach(async () => {
    mockSubscriptionModel = {
      findOne: jest.fn(),
    };

    mockProcessedEventModel = {
      findOne: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: getModelToken("OrganizationSubscription"), useValue: mockSubscriptionModel },
        { provide: getModelToken("ProcessedStripeEvent"), useValue: mockProcessedEventModel },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getByOrganization", () => {
    it("should return default 'none' response when no subscription found", async () => {
      mockSubscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.getByOrganization("org-1");

      expect(mockSubscriptionModel.findOne).toHaveBeenCalledWith({ organizationId: "org-1" });
      expect(result).toEqual({
        organizationId: "org-1",
        status: "none",
        hasAccess: false,
        trialEndsAt: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        planLabel: "9,99 € / mois, sans engagement",
      });
    });

    it("should return subscription response when doc found with active status", async () => {
      const doc = mockSubscriptionDoc({ stripeStatus: "active" });
      mockSubscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.getByOrganization("org-1");

      expect(result.organizationId).toBe("org-1");
      expect(result.status).toBe("active");
      expect(result.hasAccess).toBe(true);
      expect(result.cancelAtPeriodEnd).toBe(false);
      expect(result.planLabel).toBe("9,99 € / mois, sans engagement");
    });

    it("should return hasAccess true for trialing status", async () => {
      const doc = mockSubscriptionDoc({ stripeStatus: "trialing" });
      mockSubscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.getByOrganization("org-1");

      expect(result.status).toBe("trialing");
      expect(result.hasAccess).toBe(true);
    });

    it("should return hasAccess true for past_due status", async () => {
      const doc = mockSubscriptionDoc({ stripeStatus: "past_due" });
      mockSubscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.getByOrganization("org-1");

      expect(result.status).toBe("past_due");
      expect(result.hasAccess).toBe(true);
    });

    it("should return hasAccess false for unpaid status", async () => {
      const doc = mockSubscriptionDoc({ stripeStatus: "unpaid" });
      mockSubscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.getByOrganization("org-1");

      expect(result.status).toBe("unpaid");
      expect(result.hasAccess).toBe(false);
    });

    it("should return hasAccess true for canceled with future currentPeriodEnd", async () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const doc = mockSubscriptionDoc({
        stripeStatus: "canceled",
        currentPeriodEnd: futureDate,
      });
      mockSubscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.getByOrganization("org-1");

      expect(result.status).toBe("canceled");
      expect(result.hasAccess).toBe(true);
    });

    it("should return hasAccess false for canceled with past currentPeriodEnd", async () => {
      const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const doc = mockSubscriptionDoc({
        stripeStatus: "canceled",
        currentPeriodEnd: pastDate,
      });
      mockSubscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.getByOrganization("org-1");

      expect(result.status).toBe("canceled");
      expect(result.hasAccess).toBe(false);
    });
  });
});
