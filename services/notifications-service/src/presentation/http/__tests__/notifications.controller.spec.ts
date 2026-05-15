import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { NotificationsController } from "../notifications.controller";
import { AbstractNotificationsService } from "../../../domain/ports/notifications.service.port";

describe("NotificationsController", () => {
  let controller: NotificationsController;
  let mockNotificationsService: jest.Mocked<AbstractNotificationsService>;

  beforeEach(async () => {
    mockNotificationsService = {
      createForOrganization: jest.fn(),
      listForUser: jest.fn(),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      getUnreadCount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: AbstractNotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("createForOrganization", () => {
    it("should delegate to service", async () => {
      const body = {
        organizationId: "org-1",
        actorId: "actor-1",
        actorName: "Actor Name",
        entityType: "case" as const,
        entityId: "entity-1",
        entityLabel: "Entity Label",
        action: "created" as const,
        userIds: ["user-1", "user-2"],
      };
      mockNotificationsService.createForOrganization.mockResolvedValue([
        { id: "notif-1" },
      ] as never);

      const result = await controller.createForOrganization(body);

      expect(mockNotificationsService.createForOrganization).toHaveBeenCalledWith(body, body.userIds);
      expect(result).toHaveLength(1);
    });

    it("should throw BadRequestException without organizationId", async () => {
      const body = {
        organizationId: "",
        actorId: "actor-1",
        actorName: "Actor Name",
        entityType: "case" as const,
        entityId: "entity-1",
        entityLabel: "Entity Label",
        action: "created" as const,
        userIds: ["user-1"],
      };

      await expect(controller.createForOrganization(body)).rejects.toThrow(BadRequestException);
      expect(mockNotificationsService.createForOrganization).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException without userIds", async () => {
      const body = {
        organizationId: "org-1",
        actorId: "actor-1",
        actorName: "Actor Name",
        entityType: "case" as const,
        entityId: "entity-1",
        entityLabel: "Entity Label",
        action: "created" as const,
        userIds: [] as string[],
      };

      await expect(controller.createForOrganization(body)).rejects.toThrow(BadRequestException);
      expect(mockNotificationsService.createForOrganization).not.toHaveBeenCalled();
    });
  });

  describe("listForUser", () => {
    it("should delegate to service", async () => {
      mockNotificationsService.listForUser.mockResolvedValue({
        notifications: [{ id: "notif-1" }],
        unreadCount: 3,
      } as never);

      const result = await controller.listForUser("user-1", "org-1");

      expect(mockNotificationsService.listForUser).toHaveBeenCalledWith(
        "user-1",
        "org-1",
        undefined,
      );
      expect(result.notifications).toHaveLength(1);
    });

    it("should throw BadRequestException without userId or organizationId", async () => {
      await expect(
        controller.listForUser(undefined as never, "org-1"),
      ).rejects.toThrow(BadRequestException);
      expect(mockNotificationsService.listForUser).not.toHaveBeenCalled();

      await expect(
        controller.listForUser("user-1", undefined as never),
      ).rejects.toThrow(BadRequestException);
    });

    it("should parse limit string to number", async () => {
      mockNotificationsService.listForUser.mockResolvedValue({
        notifications: [],
        unreadCount: 0,
      } as never);

      await controller.listForUser("user-1", "org-1", "25");

      expect(mockNotificationsService.listForUser).toHaveBeenCalledWith("user-1", "org-1", 25);
    });
  });

  describe("markAsRead", () => {
    it("should delegate to service", async () => {
      mockNotificationsService.markAsRead.mockResolvedValue({ id: "notif-1" } as never);

      const result = await controller.markAsRead("notif-1", "user-1");

      expect(mockNotificationsService.markAsRead).toHaveBeenCalledWith("notif-1", "user-1");
      expect(result.id).toBe("notif-1");
    });

    it("should throw BadRequestException without userId", async () => {
      await expect(
        controller.markAsRead("notif-1", undefined as never),
      ).rejects.toThrow(BadRequestException);
      expect(mockNotificationsService.markAsRead).not.toHaveBeenCalled();
    });
  });

  describe("markAllAsRead", () => {
    it("should delegate to service", async () => {
      mockNotificationsService.markAllAsRead.mockResolvedValue({ updated: 5 } as never);

      const result = await controller.markAllAsRead("user-1", "org-1");

      expect(mockNotificationsService.markAllAsRead).toHaveBeenCalledWith("user-1", "org-1");
      expect(result).toEqual({ updated: 5 });
    });

    it("should throw BadRequestException without params", async () => {
      await expect(
        controller.markAllAsRead(undefined as never, "org-1"),
      ).rejects.toThrow(BadRequestException);
      expect(mockNotificationsService.markAllAsRead).not.toHaveBeenCalled();

      await expect(
        controller.markAllAsRead("user-1", undefined as never),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getUnreadCount", () => {
    it("should delegate to service", async () => {
      mockNotificationsService.getUnreadCount.mockResolvedValue({ count: 7 } as never);

      const result = await controller.getUnreadCount("user-1", "org-1");

      expect(mockNotificationsService.getUnreadCount).toHaveBeenCalledWith("user-1", "org-1");
      expect(result).toEqual({ count: 7 });
    });

    it("should throw BadRequestException without params", async () => {
      await expect(
        controller.getUnreadCount(undefined as never, "org-1"),
      ).rejects.toThrow(BadRequestException);
      expect(mockNotificationsService.getUnreadCount).not.toHaveBeenCalled();

      await expect(
        controller.getUnreadCount("user-1", undefined as never),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
