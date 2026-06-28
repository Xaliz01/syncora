import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { PushSubscriptionService } from "../push-subscription.service";
import { AbstractPushSubscriptionService } from "../ports/push-subscription.service.port";

describe("PushSubscriptionService", () => {
  let service: PushSubscriptionService;
  let mockSubscriptionModel: {
    findOneAndUpdate: jest.Mock;
    deleteOne: jest.Mock;
    find: jest.Mock;
    deleteMany: jest.Mock;
  };

  const mockSubDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: { toString: () => "sub-123" },
    userId: "user-1",
    organizationId: "org-1",
    endpoint: "https://push.example.com/sub1",
    p256dh: "test-p256dh",
    auth: "test-auth",
    get: jest.fn((key: string) => (key === "createdAt" ? new Date("2025-01-01") : undefined)),
    ...overrides,
  });

  beforeEach(async () => {
    mockSubscriptionModel = {
      findOneAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
      deleteOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      }),
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
      deleteMany: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: AbstractPushSubscriptionService,
          useClass: PushSubscriptionService,
        },
        {
          provide: getModelToken("PushSubscription"),
          useValue: mockSubscriptionModel,
        },
      ],
    }).compile();

    service = module.get<AbstractPushSubscriptionService>(
      AbstractPushSubscriptionService,
    ) as PushSubscriptionService;
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("register", () => {
    it("should upsert push subscription by endpoint", async () => {
      const doc = mockSubDoc();
      mockSubscriptionModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.register(
        "user-1",
        "org-1",
        "https://push.example.com/sub1",
        "test-p256dh",
        "test-auth",
      );

      expect(mockSubscriptionModel.findOneAndUpdate).toHaveBeenCalledWith(
        { endpoint: "https://push.example.com/sub1" },
        {
          $set: {
            userId: "user-1",
            organizationId: "org-1",
            p256dh: "test-p256dh",
            auth: "test-auth",
          },
        },
        { new: true, upsert: true },
      );
      expect(result.id).toBe("sub-123");
      expect(result.endpoint).toBe("https://push.example.com/sub1");
    });
  });

  describe("unregister", () => {
    it("should delete subscription by userId and endpoint", async () => {
      mockSubscriptionModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      });

      const result = await service.unregister("user-1", "https://push.example.com/sub1");

      expect(mockSubscriptionModel.deleteOne).toHaveBeenCalledWith({
        userId: "user-1",
        endpoint: "https://push.example.com/sub1",
      });
      expect(result).toEqual({ deleted: true });
    });

    it("should return deleted: false when not found", async () => {
      mockSubscriptionModel.deleteOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      });

      const result = await service.unregister("user-1", "https://unknown.example.com");

      expect(result).toEqual({ deleted: false });
    });
  });

  describe("listForUser", () => {
    it("should list subscriptions for a user", async () => {
      const docs = [mockSubDoc(), mockSubDoc({ _id: { toString: () => "sub-456" } })];
      mockSubscriptionModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue(docs),
      });

      const result = await service.listForUser("user-1", "org-1");

      expect(mockSubscriptionModel.find).toHaveBeenCalledWith({
        userId: "user-1",
        organizationId: "org-1",
      });
      expect(result).toHaveLength(2);
    });
  });

  describe("sendPushToUser", () => {
    it("should return sent: 0 when VAPID is not configured", async () => {
      const result = await service.sendPushToUser("user-1", "org-1", {
        title: "Test",
        body: "Test body",
      });

      expect(result).toEqual({ sent: 0, failed: 0 });
    });
  });
});
