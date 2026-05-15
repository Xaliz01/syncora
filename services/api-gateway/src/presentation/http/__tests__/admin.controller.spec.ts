import { Test, TestingModule } from "@nestjs/testing";
import { AdminController } from "../admin.controller";
import { AbstractAdminService } from "../../../domain/ports/admin.service.port";
import { JwtAuthGuard } from "../../../infrastructure/jwt-auth.guard";
import { RequirePermissionGuard } from "../../../infrastructure/require-permission.guard";
import { SubscriptionAccessGuard } from "../../../infrastructure/subscription-access.guard";
import type { AuthUser } from "@syncora/shared";

describe("AdminController", () => {
  let controller: AdminController;
  let mockAdminService: jest.Mocked<AbstractAdminService>;

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
    mockAdminService = {
      getPermissionsCatalog: jest.fn(),
      inviteUser: jest.fn(),
      listOrganizationUsers: jest.fn(),
      getOrganizationUser: jest.fn(),
      assignUserPermissions: jest.fn(),
      createPermissionProfile: jest.fn(),
      listPermissionProfiles: jest.fn(),
      getPermissionProfile: jest.fn(),
      updatePermissionProfile: jest.fn(),
      deletePermissionProfile: jest.fn(),
      listInvitations: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AbstractAdminService,
          useValue: mockAdminService,
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

    controller = module.get<AdminController>(AdminController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getPermissionsCatalog", () => {
    it("should call adminService.getPermissionsCatalog", () => {
      const expected = { availablePermissions: ["users.read", "users.invite"] };
      mockAdminService.getPermissionsCatalog.mockReturnValue(expected as never);

      const result = controller.getPermissionsCatalog();

      expect(mockAdminService.getPermissionsCatalog).toHaveBeenCalled();
      expect(result).toEqual(expected);
    });
  });

  describe("inviteUser", () => {
    it("should call adminService.inviteUser with user and body", async () => {
      const body = { email: "new@example.com", name: "New User", role: "member" as const };
      mockAdminService.inviteUser.mockResolvedValue({ id: "invite-1" } as never);

      const result = await controller.inviteUser(mockUser, body);

      expect(mockAdminService.inviteUser).toHaveBeenCalledWith(mockUser, body);
      expect(result).toEqual({ id: "invite-1" });
    });
  });

  describe("listOrganizationUsers", () => {
    it("should call adminService.listOrganizationUsers with user", async () => {
      mockAdminService.listOrganizationUsers.mockResolvedValue([{ id: "u-1" }] as never);

      const result = await controller.listOrganizationUsers(mockUser);

      expect(mockAdminService.listOrganizationUsers).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual([{ id: "u-1" }]);
    });
  });

  describe("getOrganizationUser", () => {
    it("should call adminService.getOrganizationUser with user and userId", async () => {
      mockAdminService.getOrganizationUser.mockResolvedValue({ id: "u-1" } as never);

      const result = await controller.getOrganizationUser(mockUser, "u-1");

      expect(mockAdminService.getOrganizationUser).toHaveBeenCalledWith(mockUser, "u-1");
      expect(result).toEqual({ id: "u-1" });
    });
  });

  describe("assignUserPermissions", () => {
    it("should call adminService.assignUserPermissions with user, userId and body", async () => {
      const body = {
        profileId: "profile-1",
        extraPermissions: [] as never[],
        revokedPermissions: [] as never[],
      };
      mockAdminService.assignUserPermissions.mockResolvedValue({ success: true } as never);

      const result = await controller.assignUserPermissions(mockUser, "u-1", body);

      expect(mockAdminService.assignUserPermissions).toHaveBeenCalledWith(mockUser, "u-1", body);
      expect(result).toEqual({ success: true });
    });
  });

  describe("createPermissionProfile", () => {
    it("should call adminService.createPermissionProfile with user and body", async () => {
      const body = { name: "Manager", permissions: [] as never[] };
      mockAdminService.createPermissionProfile.mockResolvedValue({ id: "profile-1" } as never);

      const result = await controller.createPermissionProfile(mockUser, body);

      expect(mockAdminService.createPermissionProfile).toHaveBeenCalledWith(mockUser, body);
      expect(result).toEqual({ id: "profile-1" });
    });
  });

  describe("listPermissionProfiles", () => {
    it("should call adminService.listPermissionProfiles with user", async () => {
      mockAdminService.listPermissionProfiles.mockResolvedValue([{ id: "profile-1" }] as never);

      const result = await controller.listPermissionProfiles(mockUser);

      expect(mockAdminService.listPermissionProfiles).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual([{ id: "profile-1" }]);
    });
  });

  describe("getPermissionProfile", () => {
    it("should call adminService.getPermissionProfile with user and profileId", async () => {
      mockAdminService.getPermissionProfile.mockResolvedValue({ id: "profile-1" } as never);

      const result = await controller.getPermissionProfile(mockUser, "profile-1");

      expect(mockAdminService.getPermissionProfile).toHaveBeenCalledWith(mockUser, "profile-1");
      expect(result).toEqual({ id: "profile-1" });
    });
  });

  describe("updatePermissionProfile", () => {
    it("should call adminService.updatePermissionProfile with user, profileId and body", async () => {
      const body = { name: "Updated Manager" };
      mockAdminService.updatePermissionProfile.mockResolvedValue({
        id: "profile-1",
        name: "Updated Manager",
      } as never);

      const result = await controller.updatePermissionProfile(mockUser, "profile-1", body);

      expect(mockAdminService.updatePermissionProfile).toHaveBeenCalledWith(
        mockUser,
        "profile-1",
        body,
      );
      expect(result).toEqual({ id: "profile-1", name: "Updated Manager" });
    });
  });

  describe("deletePermissionProfile", () => {
    it("should call adminService.deletePermissionProfile with user and profileId", async () => {
      mockAdminService.deletePermissionProfile.mockResolvedValue({ deleted: true } as never);

      const result = await controller.deletePermissionProfile(mockUser, "profile-1");

      expect(mockAdminService.deletePermissionProfile).toHaveBeenCalledWith(mockUser, "profile-1");
      expect(result).toEqual({ deleted: true });
    });
  });

  describe("listInvitations", () => {
    it("should call adminService.listInvitations with user and status", async () => {
      mockAdminService.listInvitations.mockResolvedValue([{ id: "inv-1" }] as never);

      const result = await controller.listInvitations(mockUser, "pending");

      expect(mockAdminService.listInvitations).toHaveBeenCalledWith(mockUser, "pending");
      expect(result).toEqual([{ id: "inv-1" }]);
    });

    it("should call adminService.listInvitations with user and undefined status", async () => {
      mockAdminService.listInvitations.mockResolvedValue([] as never);

      const result = await controller.listInvitations(mockUser, undefined);

      expect(mockAdminService.listInvitations).toHaveBeenCalledWith(mockUser, undefined);
      expect(result).toEqual([]);
    });
  });
});
