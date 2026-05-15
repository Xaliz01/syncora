import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { NotFoundException } from "@nestjs/common";
import { NotificationsService } from "../notifications.service";
import { AbstractNotificationsService } from "../ports/notifications.service.port";

const updateChain = (result: Record<string, unknown> = { matchedCount: 1, modifiedCount: 1 }) => {
  const p = Promise.resolve(result);
  return {
    exec: jest.fn().mockImplementation(() => p),
    then: (fn?: (v: unknown) => unknown) => p.then(fn),
  };
};

describe("NotificationsService", () => {
  let service: NotificationsService;
  let mockNotificationModel: {
    insertMany: jest.Mock;
    find: jest.Mock;
    findOneAndUpdate: jest.Mock;
    updateMany: jest.Mock;
    countDocuments: jest.Mock;
  };

  const mockNotificationDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: { toString: () => "notif-123" },
    organizationId: "org-1",
    userId: "user-1",
    actorId: "actor-1",
    actorName: "Actor Name",
    entityType: "case",
    entityId: "entity-1",
    entityLabel: "Entity Label",
    action: "created",
    read: false,
    get: jest.fn((key: string) => (key === "createdAt" ? new Date("2025-01-01") : undefined)),
    ...overrides,
  });

  beforeEach(async () => {
    const execMock = jest.fn();
    const findChain = {
      sort: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ exec: execMock }) }),
    };

    mockNotificationModel = {
      insertMany: jest.fn(),
      find: jest.fn().mockReturnValue(findChain),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: execMock }),
      updateMany: jest.fn().mockImplementation(() => updateChain()),
      countDocuments: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: AbstractNotificationsService, useClass: NotificationsService },
        { provide: getModelToken("Notification"), useValue: mockNotificationModel },
      ],
    }).compile();

    service = module.get<AbstractNotificationsService>(
      AbstractNotificationsService,
    ) as NotificationsService;
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createForOrganization", () => {
    const body = {
      organizationId: "org-1",
      actorId: "actor-1",
      actorName: "Actor Name",
      entityType: "case" as const,
      entityId: "entity-1",
      entityLabel: "Entity Label",
      action: "created" as const,
    };

    it("should filter out actorId from recipients", async () => {
      const doc = mockNotificationDoc({ userId: "user-2" });
      mockNotificationModel.insertMany.mockResolvedValue([doc]);

      const result = await service.createForOrganization(body, ["actor-1", "user-2"]);

      expect(mockNotificationModel.insertMany).toHaveBeenCalledWith([
        expect.objectContaining({ userId: "user-2" }),
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe("user-2");
    });

    it("should return empty array if all users are the actor", async () => {
      const result = await service.createForOrganization(body, ["actor-1"]);

      expect(mockNotificationModel.insertMany).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it("should create notifications for multiple users", async () => {
      const docs = [
        mockNotificationDoc({ _id: { toString: () => "notif-1" }, userId: "user-2" }),
        mockNotificationDoc({ _id: { toString: () => "notif-2" }, userId: "user-3" }),
      ];
      mockNotificationModel.insertMany.mockResolvedValue(docs);

      const result = await service.createForOrganization(body, ["user-2", "user-3"]);

      expect(mockNotificationModel.insertMany).toHaveBeenCalledWith([
        expect.objectContaining({ userId: "user-2", read: false }),
        expect.objectContaining({ userId: "user-3", read: false }),
      ]);
      expect(result).toHaveLength(2);
    });
  });

  describe("listForUser", () => {
    it("should return notifications and unread count", async () => {
      const docs = [mockNotificationDoc()];
      const limitExec = jest.fn().mockResolvedValue(docs);
      const limitMock = jest.fn().mockReturnValue({ exec: limitExec });
      const sortMock = jest.fn().mockReturnValue({ limit: limitMock });
      mockNotificationModel.find.mockReturnValue({ sort: sortMock });
      mockNotificationModel.countDocuments.mockResolvedValue(3);

      const result = await service.listForUser("user-1", "org-1", 50);

      expect(mockNotificationModel.find).toHaveBeenCalledWith({
        userId: "user-1",
        organizationId: "org-1",
      });
      expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
      expect(limitMock).toHaveBeenCalledWith(50);
      expect(mockNotificationModel.countDocuments).toHaveBeenCalledWith({
        userId: "user-1",
        organizationId: "org-1",
        read: false,
      });
      expect(result.notifications).toHaveLength(1);
      expect(result.unreadCount).toBe(3);
    });
  });

  describe("markAsRead", () => {
    it("should mark notification as read", async () => {
      const doc = mockNotificationDoc({ read: true });
      mockNotificationModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.markAsRead("notif-123", "user-1");

      expect(mockNotificationModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: "notif-123", userId: "user-1" },
        { $set: { read: true } },
        { new: true },
      );
      expect(result.id).toBe("notif-123");
      expect(result.read).toBe(true);
    });

    it("should throw NotFoundException when not found", async () => {
      mockNotificationModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.markAsRead("non-existent", "user-1")).rejects.toThrow(NotFoundException);
    });
  });

  describe("markAllAsRead", () => {
    it("should update all unread notifications", async () => {
      mockNotificationModel.updateMany.mockImplementation(() => updateChain({ modifiedCount: 5 }));

      const result = await service.markAllAsRead("user-1", "org-1");

      expect(mockNotificationModel.updateMany).toHaveBeenCalledWith(
        { userId: "user-1", organizationId: "org-1", read: false },
        { $set: { read: true } },
      );
      expect(result).toEqual({ updated: 5 });
    });
  });

  describe("getUnreadCount", () => {
    it("should return count", async () => {
      mockNotificationModel.countDocuments.mockResolvedValue(7);

      const result = await service.getUnreadCount("user-1", "org-1");

      expect(mockNotificationModel.countDocuments).toHaveBeenCalledWith({
        userId: "user-1",
        organizationId: "org-1",
        read: false,
      });
      expect(result).toEqual({ count: 7 });
    });
  });
});
