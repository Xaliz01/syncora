import { ForbiddenException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { Test } from "@nestjs/testing";
import { of } from "rxjs";
import type { AuthUser } from "@syncora/shared";
import { AdminService } from "../admin.service";

describe("AdminService", () => {
  let service: AdminService;
  let httpService: { request: jest.Mock };

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
    httpService = { request: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [AdminService, { provide: HttpService, useValue: httpService }],
    }).compile();
    service = module.get(AdminService);
  });

  describe("assignUserPermissions", () => {
    it("allows profile-only updates with users.assign_profile", async () => {
      httpService.request.mockImplementation(({ url, method }: { url: string; method: string }) => {
        if (method === "get" && url.includes("/users/user-2")) {
          return of({
            data: {
              id: "user-2",
              organizationId: "org-1",
              role: "member",
              email: "target@example.com",
              status: "active",
            },
          });
        }
        if (method === "PUT" && url.includes("/assignments/")) {
          return of({
            data: {
              organizationId: "org-1",
              userId: "user-2",
              profileId: "profile-1",
              extraPermissions: [],
              revokedPermissions: [],
              effectivePermissions: ["cases.read"],
            },
          });
        }
        if (method === "POST" && url.includes("/permissions/effective")) {
          return of({ data: { permissions: ["cases.read"] } });
        }
        return of({ data: {} });
      });

      await expect(
        service.assignUserPermissions(actor, "user-2", { profileId: "profile-1" }),
      ).resolves.toMatchObject({ userId: "user-2" });
    });

    it("rejects extra permissions without users.manage_permissions", async () => {
      httpService.request.mockImplementation(({ url, method }: { url: string; method: string }) => {
        if (method === "get" && url.includes("/users/user-2")) {
          return of({
            data: {
              id: "user-2",
              organizationId: "org-1",
              role: "member",
              email: "target@example.com",
              status: "active",
            },
          });
        }
        return of({ data: {} });
      });

      await expect(
        service.assignUserPermissions(actor, "user-2", {
          extraPermissions: ["cases.read"],
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
