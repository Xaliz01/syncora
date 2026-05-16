import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { SubscriptionsService } from "../subscriptions.service";
import { BadRequestException, NotFoundException } from "@nestjs/common";

const mockBillingPortalSessionsCreate = jest.fn();
const mockCheckoutSessionsCreate = jest.fn();
const mockSubscriptionsRetrieve = jest.fn();
const mockSubscriptionsUpdate = jest.fn();
const mockInvoicesFinalize = jest.fn();
const mockCustomersRetrieve = jest.fn();
const mockCustomersCreate = jest.fn();
const mockCustomersList = jest.fn();
jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({
    billingPortal: {
      sessions: { create: mockBillingPortalSessionsCreate },
    },
    subscriptions: {
      retrieve: mockSubscriptionsRetrieve,
      update: mockSubscriptionsUpdate,
    },
    invoices: {
      finalizeInvoice: mockInvoicesFinalize,
    },
    customers: {
      retrieve: mockCustomersRetrieve,
      create: mockCustomersCreate,
      list: mockCustomersList,
    },
    checkout: { sessions: { create: mockCheckoutSessionsCreate } },
    webhooks: { constructEvent: jest.fn() },
    errors: { StripeInvalidRequestError: class StripeInvalidRequestError extends Error {} },
  }));
});

describe("SubscriptionsService", () => {
  let service: SubscriptionsService;
  let mockSubscriptionModel: {
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
    updateOne: jest.Mock;
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
    activeAddons: [],
    addonStripeSubscriptionIds: new Map(),
    ...overrides,
  });

  beforeEach(async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_mock";
    mockBillingPortalSessionsCreate.mockReset();
    mockCheckoutSessionsCreate.mockReset();
    mockSubscriptionsRetrieve.mockReset();
    mockSubscriptionsUpdate.mockReset();
    mockInvoicesFinalize.mockReset();
    mockCustomersRetrieve.mockReset();
    mockCustomersCreate.mockReset();
    mockCustomersList.mockReset();

    const chainableFindOne = () => ({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
      exec: jest.fn().mockResolvedValue(null),
    });

    mockSubscriptionModel = {
      findOne: jest.fn().mockImplementation(chainableFindOne),
      findOneAndUpdate: jest.fn(),
      updateOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
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
        planName: "Essentiel",
        planLabel: "9,99 € / mois, sans engagement",
        activeAddons: [],
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
      expect(result.planName).toBe("Essentiel");
      expect(result.planLabel).toBe("9,99 € / mois, sans engagement");
      expect(result.activeAddons).toEqual([]);
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

    it("should include activeAddons in response when present", async () => {
      const doc = mockSubscriptionDoc({
        stripeStatus: "active",
        activeAddons: ["team_suggestion"],
      });
      mockSubscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.getByOrganization("org-1");

      expect(result.activeAddons).toEqual(["team_suggestion"]);
    });

    it("should filter out invalid addon codes from response", async () => {
      const doc = mockSubscriptionDoc({
        stripeStatus: "active",
        activeAddons: ["team_suggestion", "invalid_addon"],
      });
      mockSubscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.getByOrganization("org-1");

      expect(result.activeAddons).toEqual(["team_suggestion"]);
    });
  });

  describe("createAddonCheckoutSession", () => {
    it("should open checkout with Essentiel + addon when no base subscription exists", async () => {
      mockSubscriptionModel.findOne.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
        exec: jest.fn().mockResolvedValue(null),
      }));
      mockCustomersList.mockResolvedValue({ data: [] });
      mockCustomersCreate.mockResolvedValue({ id: "cus_new" });
      mockSubscriptionModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      mockCheckoutSessionsCreate.mockResolvedValue({
        url: "https://checkout.stripe.com/base-plus-addon",
      });

      const result = await service.createAddonCheckoutSession({
        organizationId: "org-1",
        addonCode: "team_suggestion",
        customerEmail: "user@example.com",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      });

      expect(result.url).toBe("https://checkout.stripe.com/base-plus-addon");
      expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "subscription",
          line_items: expect.arrayContaining([
            expect.objectContaining({ quantity: 1 }),
            expect.objectContaining({ quantity: 1 }),
          ]),
          metadata: expect.objectContaining({ checkoutKind: "base_plus_addon" }),
        }),
      );
    });

    it("should redirect to hosted invoice when adding addon to existing Essentiel subscription", async () => {
      const doc = mockSubscriptionDoc({ stripeStatus: "active" });
      mockSubscriptionModel.findOne.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) }),
        exec: jest.fn().mockResolvedValue(doc),
      }));
      mockSubscriptionsRetrieve.mockResolvedValue({
        id: "sub_123",
        customer: "cus_123",
        items: { data: [{ id: "si_base", quantity: 1, price: { id: "price_base" } }] },
      });
      mockSubscriptionsUpdate.mockResolvedValue({
        id: "sub_123",
        customer: "cus_123",
        status: "active",
        items: { data: [] },
        latest_invoice: {
          id: "in_open",
          status: "open",
          amount_due: 499,
          hosted_invoice_url: "https://invoice.stripe.com/pay-addon",
        },
      });

      const result = await service.createAddonCheckoutSession({
        organizationId: "org-1",
        addonCode: "team_suggestion",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      });

      expect(result.url).toBe("https://invoice.stripe.com/pay-addon");
      expect(mockSubscriptionsUpdate).toHaveBeenCalledWith(
        "sub_123",
        expect.objectContaining({
          payment_behavior: "pending_if_incomplete",
        }),
      );
      expect(mockSubscriptionModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it("should return success URL when trial invoice is already paid at 0 € (no receipt page)", async () => {
      const doc = mockSubscriptionDoc({ stripeStatus: "trialing" });
      mockSubscriptionModel.findOne.mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(doc),
      }));
      mockSubscriptionsRetrieve.mockResolvedValue({
        id: "sub_123",
        customer: "cus_123",
        items: { data: [{ id: "si_base", quantity: 1, price: { id: "price_base" } }] },
      });
      mockSubscriptionsUpdate.mockResolvedValue({
        id: "sub_123",
        customer: "cus_123",
        latest_invoice: {
          id: "in_paid",
          status: "paid",
          amount_due: 0,
          hosted_invoice_url: "https://invoice.stripe.com/receipt-zero",
        },
      });

      const result = await service.createAddonCheckoutSession({
        organizationId: "org-1",
        addonCode: "team_suggestion",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      });

      expect(result.url).toBe("https://example.com/success");
    });

    it("should finalize draft invoice before redirecting to hosted paywall", async () => {
      const doc = mockSubscriptionDoc({ stripeStatus: "active" });
      mockSubscriptionModel.findOne.mockImplementation(() => ({
        exec: jest.fn().mockResolvedValue(doc),
      }));
      mockSubscriptionsRetrieve.mockResolvedValue({
        id: "sub_123",
        customer: "cus_123",
        items: { data: [{ id: "si_base", quantity: 1, price: { id: "price_base" } }] },
      });
      mockSubscriptionsUpdate.mockResolvedValue({
        id: "sub_123",
        customer: "cus_123",
        latest_invoice: { id: "in_draft", status: "draft", amount_due: 499 },
      });
      mockInvoicesFinalize.mockResolvedValue({
        id: "in_draft",
        status: "open",
        amount_due: 499,
        hosted_invoice_url: "https://invoice.stripe.com/finalized",
      });

      const result = await service.createAddonCheckoutSession({
        organizationId: "org-1",
        addonCode: "team_suggestion",
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      });

      expect(mockInvoicesFinalize).toHaveBeenCalledWith("in_draft");
      expect(result.url).toBe("https://invoice.stripe.com/finalized");
    });

    it("should throw BadRequestException for invalid addon code", async () => {
      await expect(
        service.createAddonCheckoutSession({
          organizationId: "org-1",
          addonCode: "invalid_addon" as never,
          successUrl: "https://example.com/success",
          cancelUrl: "https://example.com/cancel",
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("updateSubscriptionAddons", () => {
    it("should remove addon line items from the base subscription", async () => {
      const doc = mockSubscriptionDoc({
        stripeStatus: "active",
        activeAddons: ["team_suggestion"],
      });
      mockSubscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });
      process.env.STRIPE_ADDON_TEAM_SUGGESTION_PRICE_ID = "price_addon_team";
      mockSubscriptionsRetrieve.mockResolvedValue({
        id: "sub_123",
        customer: "cus_123",
        metadata: { organizationId: "org-1" },
        items: {
          data: [
            { id: "si_base", quantity: 1, price: { id: "price_base" } },
            { id: "si_addon", quantity: 1, price: { id: "price_addon_team" } },
          ],
        },
      });
      mockSubscriptionsUpdate.mockResolvedValue({
        id: "sub_123",
        customer: "cus_123",
        status: "active",
        items: { data: [{ id: "si_base", price: { id: "price_base" } }] },
        latest_invoice: {
          id: "in_paid",
          status: "paid",
          amount_due: 0,
        },
      });
      mockSubscriptionModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });
      mockCustomersRetrieve.mockResolvedValue({
        id: "cus_123",
        metadata: { organizationId: "org-1" },
      });

      const result = await service.updateSubscriptionAddons({
        organizationId: "org-1",
        addonCodes: [],
        successUrl: "https://example.com/success",
      });

      expect(result.url).toBe("https://example.com/success");
      expect(mockSubscriptionsUpdate).toHaveBeenCalledWith(
        "sub_123",
        expect.objectContaining({
          items: expect.arrayContaining([{ id: "si_addon", deleted: true }]),
        }),
      );
      expect(mockSubscriptionModel.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it("should throw when no changes are requested", async () => {
      const doc = mockSubscriptionDoc({ stripeStatus: "active" });
      mockSubscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });
      mockSubscriptionsRetrieve.mockResolvedValue({
        id: "sub_123",
        customer: "cus_123",
        items: { data: [{ id: "si_base", quantity: 1, price: { id: "price_base" } }] },
      });

      await expect(
        service.updateSubscriptionAddons({
          organizationId: "org-1",
          addonCodes: [],
          successUrl: "https://example.com/success",
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("createBillingPortalSession", () => {
    it("should open the standard billing portal for the organization customer", async () => {
      const doc = mockSubscriptionDoc();
      mockSubscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });
      mockSubscriptionsRetrieve.mockResolvedValue({
        id: "sub_123",
        customer: "cus_from_sub",
        metadata: { organizationId: "org-1" },
      });
      mockBillingPortalSessionsCreate.mockResolvedValue({
        url: "https://billing.stripe.com/portal-full",
      });

      const result = await service.createBillingPortalSession({
        organizationId: "org-1",
        returnUrl: "https://app.example.com/organization",
      });

      expect(result.url).toBe("https://billing.stripe.com/portal-full");
      expect(mockBillingPortalSessionsCreate).toHaveBeenCalledWith({
        customer: "cus_from_sub",
        return_url: "https://app.example.com/organization",
      });
    });

    it("should deep-link subscription_update when flow is subscription_update", async () => {
      const doc = mockSubscriptionDoc();
      mockSubscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });
      mockSubscriptionsRetrieve.mockResolvedValue({
        id: "sub_123",
        customer: "cus_from_sub",
        metadata: { organizationId: "org-1" },
      });
      mockBillingPortalSessionsCreate.mockResolvedValue({
        url: "https://billing.stripe.com/portal-addon",
      });

      const result = await service.createBillingPortalSession({
        organizationId: "org-1",
        returnUrl: "https://app.example.com/cases/1",
        flow: "subscription_update",
      });

      expect(result.url).toBe("https://billing.stripe.com/portal-addon");
      expect(mockBillingPortalSessionsCreate).toHaveBeenCalledWith({
        customer: "cus_from_sub",
        return_url: "https://app.example.com/cases/1",
        flow_data: {
          type: "subscription_update",
          subscription_update: { subscription: "sub_123" },
          after_completion: {
            type: "redirect",
            redirect: { return_url: "https://app.example.com/cases/1" },
          },
        },
      });
    });

    it("should throw NotFoundException when no Stripe billing data exists", async () => {
      mockSubscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.createBillingPortalSession({
          organizationId: "org-1",
          returnUrl: "https://app.example.com/organization",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException when subscription belongs to another organization", async () => {
      const doc = mockSubscriptionDoc();
      mockSubscriptionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });
      mockSubscriptionsRetrieve.mockResolvedValue({
        id: "sub_123",
        customer: "cus_other",
        metadata: { organizationId: "org-other" },
      });

      await expect(
        service.createBillingPortalSession({
          organizationId: "org-1",
          returnUrl: "https://app.example.com/organization",
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
