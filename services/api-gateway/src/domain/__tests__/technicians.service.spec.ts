import { ConflictException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import type { AuthUser, PermissionProfileResponse, UserResponse } from "@planwise/shared";
import {
  TECHNICIAN_FIELD_DEFAULT_PERMISSIONS,
  TECHNICIAN_FIELD_PROFILE_NAME,
} from "@planwise/shared";
import { TechniciansGatewayService } from "../technicians.service";
import { OrganizationScopedHttpClient } from "../../infrastructure/organization-scoped-http.client";

describe("TechniciansGatewayService", () => {
  let service: TechniciansGatewayService;
  const scopedRequest = jest.fn();

  const admin: AuthUser = {
    id: "admin-1",
    email: "admin@test.fr",
    organizationId: "org-1",
    role: "admin",
    status: "active",
    permissions: ["fleet.technicians.create_user"],
    name: "Admin",
  };

  const createdUser: UserResponse = {
    id: "user-tech-1",
    organizationId: "org-1",
    email: "tech@test.fr",
    name: "Jean Dupont",
    role: "member",
    status: "active",
  };

  const fieldProfile: PermissionProfileResponse = {
    id: "profile-field-1",
    organizationId: "org-1",
    name: TECHNICIAN_FIELD_PROFILE_NAME,
    permissions: [...TECHNICIAN_FIELD_DEFAULT_PERMISSIONS],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TechniciansGatewayService,
        {
          provide: OrganizationScopedHttpClient,
          useValue: { request: scopedRequest },
        },
      ],
    }).compile();

    service = module.get(TechniciansGatewayService);

    scopedRequest.mockImplementation(async (options: { path?: string; method?: string }) => {
      if (options.path === "/subscriptions/current" && options.method === "get") {
        return { hasAccess: true, maxUsers: 10, includedUsers: 3 };
      }
      if (options.path === "/users" && options.method === "get") {
        return [createdUser];
      }
      if (options.path === "/users" && options.method === "post") {
        return createdUser;
      }
      if (options.path === "/profiles" && options.method === "get") {
        return [fieldProfile];
      }
      if (options.path?.startsWith("/assignments/") && options.method === "put") {
        return {
          organizationId: "org-1",
          userId: createdUser.id,
          profileId: fieldProfile.id,
          extraPermissions: [],
          revokedPermissions: [],
          effectivePermissions: fieldProfile.permissions,
        };
      }
      if (options.path === "/technicians/t1/link-user" && options.method === "put") {
        return { id: "t1", userId: createdUser.id, organizationId: "org-1" };
      }
      if (options.path === "/technicians/t1" && options.method === "get") {
        return {
          id: "t1",
          organizationId: "org-1",
          firstName: "Jean",
          lastName: "Dupont",
          email: "tech@test.fr",
          status: "actif",
        };
      }
      throw new Error(`Unexpected request: ${options.method} ${options.path}`);
    });
  });

  it("should assign the default technician profile when creating a user account", async () => {
    await service.createTechnicianUserAccount(admin, "t1", { password: "secret123" });

    expect(scopedRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        path: `/assignments/${createdUser.id}`,
        method: "put",
        body: expect.objectContaining({
          userId: createdUser.id,
          profileId: fieldProfile.id,
        }),
      }),
    );
  });

  it("should create the default technician profile when it does not exist yet", async () => {
    scopedRequest.mockImplementation(async (options: { path?: string; method?: string }) => {
      if (options.path === "/subscriptions/current") {
        return { hasAccess: true, maxUsers: 10, includedUsers: 3 };
      }
      if (options.path === "/users" && options.method === "get") return [];
      if (options.path === "/users" && options.method === "post") return createdUser;
      if (options.path === "/profiles" && options.method === "get") return [];
      if (options.path === "/profiles" && options.method === "post") return fieldProfile;
      if (options.path?.startsWith("/assignments/")) {
        return {
          organizationId: "org-1",
          userId: createdUser.id,
          profileId: fieldProfile.id,
          extraPermissions: [],
          revokedPermissions: [],
          effectivePermissions: fieldProfile.permissions,
        };
      }
      if (options.path === "/technicians/t1") {
        return {
          id: "t1",
          organizationId: "org-1",
          firstName: "Jean",
          lastName: "Dupont",
          email: "tech@test.fr",
          status: "actif",
        };
      }
      if (options.path === "/technicians/t1/link-user") {
        return { id: "t1", userId: createdUser.id, organizationId: "org-1" };
      }
      throw new Error(`Unexpected request: ${options.method} ${options.path}`);
    });

    await service.createTechnicianUserAccount(admin, "t1", { password: "secret123" });

    expect(scopedRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/profiles",
        method: "post",
        body: expect.objectContaining({
          name: TECHNICIAN_FIELD_PROFILE_NAME,
          permissions: [...TECHNICIAN_FIELD_DEFAULT_PERMISSIONS],
        }),
      }),
    );
  });

  it("should reuse an existing profile after a concurrent create conflict", async () => {
    let profileListCalls = 0;
    scopedRequest.mockImplementation(async (options: { path?: string; method?: string }) => {
      if (options.path === "/subscriptions/current") {
        return { hasAccess: true, maxUsers: 10, includedUsers: 3 };
      }
      if (options.path === "/users" && options.method === "get") return [];
      if (options.path === "/users" && options.method === "post") return createdUser;
      if (options.path === "/profiles" && options.method === "get") {
        profileListCalls += 1;
        return profileListCalls === 1 ? [] : [fieldProfile];
      }
      if (options.path === "/profiles" && options.method === "post") {
        throw new ConflictException("Profile name already exists in organization");
      }
      if (options.path?.startsWith("/assignments/")) {
        return {
          organizationId: "org-1",
          userId: createdUser.id,
          profileId: fieldProfile.id,
          extraPermissions: [],
          revokedPermissions: [],
          effectivePermissions: fieldProfile.permissions,
        };
      }
      if (options.path === "/technicians/t1") {
        return {
          id: "t1",
          organizationId: "org-1",
          firstName: "Jean",
          lastName: "Dupont",
          email: "tech@test.fr",
          status: "actif",
        };
      }
      if (options.path === "/technicians/t1/link-user") {
        return { id: "t1", userId: createdUser.id, organizationId: "org-1" };
      }
      throw new Error(`Unexpected request: ${options.method} ${options.path}`);
    });

    await service.createTechnicianUserAccount(admin, "t1", { password: "secret123" });

    expect(scopedRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        path: `/assignments/${createdUser.id}`,
        method: "put",
      }),
    );
  });
});
