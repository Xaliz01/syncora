import { Test, TestingModule } from "@nestjs/testing";
import { NotificationsController } from "../notifications.controller";
import { AbstractNotificationsGatewayService } from "../../../domain/ports/notifications.gateway.service.port";
import { JwtAuthGuard } from "../../../infrastructure/jwt-auth.guard";
import { RequirePermissionGuard } from "../../../infrastructure/require-permission.guard";
import { SubscriptionAccessGuard } from "../../../infrastructure/subscription-access.guard";
import type { AuthUser } from "@syncora/shared";

describe("NotificationsController", () => {
  let controller: NotificationsController;
  let mockNotificationsService: jest.Mocked<AbstractNotificationsGatewayService>;

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
    mockNotificationsService = {
      listForCurrentUser: jest.fn(),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      getUnreadCount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: AbstractNotificationsGatewayService,
          useValue: mockNotificationsService,
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

    controller = module.get<NotificationsController>(NotificationsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("list", () => {
    it("should call notificationsService.listForCurrentUser with user and parsed limit", async () => {
      mockNotificationsService.listForCurrentUser.mockResolvedValue({ items: [], total: 0 } as never);

      const result = await controller.list(mockUser, "20");

      expect(mockNotificationsService.listForCurrentUser).toHaveBeenCalledWith(mockUser, 20);
      expect(result).toEqual({ items: [], total: 0 });
    });

    it("should call notificationsService.listForCurrentUser with undefined when no limit", async () => {
      mockNotificationsService.listForCurrentUser.mockResolvedValue({ items: [], total: 0 } as never);

      const result = await controller.list(mockUser, undefined);

      expect(mockNotificationsService.listForCurrentUser).toHaveBeenCalledWith(mockUser, undefined);
      expect(result).toEqual({ items: [], total: 0 });
    });
  });

  describe("markAsRead", () => {
    it("should call notificationsService.markAsRead with user and id", async () => {
      mockNotificationsService.markAsRead.mockResolvedValue({ id: "notif-1", read: true } as never);

      const result = await controller.markAsRead(mockUser, "notif-1");

      expect(mockNotificationsService.markAsRead).toHaveBeenCalledWith(mockUser, "notif-1");
      expect(result).toEqual({ id: "notif-1", read: true });
    });
  });

  describe("markAllAsRead", () => {
    it("should call notificationsService.markAllAsRead with user", async () => {
      mockNotificationsService.markAllAsRead.mockResolvedValue({ updated: 5 } as never);

      const result = await controller.markAllAsRead(mockUser);

      expect(mockNotificationsService.markAllAsRead).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual({ updated: 5 });
    });
  });

  describe("getUnreadCount", () => {
    it("should call notificationsService.getUnreadCount with user", async () => {
      mockNotificationsService.getUnreadCount.mockResolvedValue({ count: 3 } as never);

      const result = await controller.getUnreadCount(mockUser);

      expect(mockNotificationsService.getUnreadCount).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual({ count: 3 });
    });
  });
});
