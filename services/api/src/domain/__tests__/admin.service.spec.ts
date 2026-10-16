import { ForbiddenException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { AuthUser } from "@planwise/shared";
import { AdminService } from "../admin.service";
import { AbstractUsersService } from "../users/ports/users.service.port";
import { AbstractPermissionsService } from "../permissions/ports/permissions.service.port";
import { AbstractEmailService } from "../notifications/ports/email.service.port";
import { SubscriptionsService } from "../subscriptions/subscriptions.service";

describe("AdminService", () => {
  let service: AdminService;
  let users: { findById: jest.Mock };
  let permissions: { assignUserPermissions: jest.Mock; resolveEffectivePermissions: jest.Mock };

  const actor: AuthUser = {
    id: "admin-user",
    email: "actor@example.com",
    organizationId: "org-1",
    role: "member",
    status: "active",
    permissions: ["users.assign_profile"],
    name: "Actor",
  };

  beforeEach(async () => {
    users = { findById: jest.fn() };
    permissions = {
      assignUserPermissions: jest.fn().mockResolvedValue({
        organizationId: "org-1",
        userId: "user-2",
        profileId: "profile-1",
        extraPermissions: [],
        revokedPermissions: [],
        effectivePermissions: ["cases.read"],
      }),
      resolveEffectivePermissions: jest.fn().mockResolvedValue({ permissions: ["cases.read"] }),
    };
    const module = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: AbstractUsersService, useValue: users },
        { provide: AbstractPermissionsService, useValue: permissions },
        { provide: AbstractEmailService, useValue: { sendTransactionalEmail: jest.fn() } },
        { provide: SubscriptionsService, useValue: { getByOrganization: jest.fn() } },
      ],
    }).compile();
    service = module.get(AdminService);
  });

  describe("assignUserPermissions", () => {
    it("allows profile-only updates with users.assign_profile", async () => {
      users.findById.mockResolvedValue({
        id: "user-2",
        organizationId: "org-1",
        role: "member",
        email: "target@example.com",
        status: "active",
      });

      await expect(
        service.assignUserPermissions(actor, "user-2", { profileId: "profile-1" }),
      ).resolves.toMatchObject({ userId: "user-2" });
      expect(permissions.assignUserPermissions).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-1",
          userId: "user-2",
          profileId: "profile-1",
        }),
      );
    });

    it("rejects extra permissions without users.manage_permissions", async () => {
      users.findById.mockResolvedValue({
        id: "user-2",
        organizationId: "org-1",
        role: "member",
        email: "target@example.com",
        status: "active",
      });

      await expect(
        service.assignUserPermissions(actor, "user-2", {
          extraPermissions: ["cases.read"],
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(users.findById).not.toHaveBeenCalled();
    });
  });
});
