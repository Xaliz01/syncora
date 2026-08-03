import { Test, TestingModule } from "@nestjs/testing";
import type { AuthUser, PermissionProfileResponse, UserResponse } from "@planwise/shared";
import {
  TECHNICIAN_FIELD_DEFAULT_PERMISSIONS,
  TECHNICIAN_FIELD_PROFILE_NAME,
} from "@planwise/shared";
import { TechniciansGatewayService } from "../technicians.service";
import { OrganizationScopedHttpClient } from "../../infrastructure/organization-scoped-http.client";
import { AbstractAdminService } from "../ports/admin.service.port";

describe("TechniciansGatewayService", () => {
  let service: TechniciansGatewayService;
  const scopedRequest = jest.fn();
  const inviteUser = jest.fn();

  const admin: AuthUser = {
    id: "admin-1",
    email: "admin@test.fr",
    organizationId: "org-1",
    role: "admin",
    status: "active",
    permissions: ["fleet.technicians.create_user"],
    name: "Admin",
  };

  const invitedUser: UserResponse = {
    id: "user-tech-1",
    organizationId: "org-1",
    email: "tech@test.fr",
    name: "Jean Dupont",
    role: "member",
    status: "invited",
    organizationMembershipStatus: "invited",
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
        {
          provide: AbstractAdminService,
          useValue: { inviteUser },
        },
      ],
    }).compile();

    service = module.get(TechniciansGatewayService);

    inviteUser.mockResolvedValue({
      invitedUser,
      assignment: {
        organizationId: "org-1",
        userId: invitedUser.id,
        profileId: fieldProfile.id,
        extraPermissions: [],
        revokedPermissions: [],
        effectivePermissions: fieldProfile.permissions,
      },
      invitation: {
        id: "inv-1",
        organizationId: "org-1",
        invitedUserId: invitedUser.id,
        invitedEmail: invitedUser.email,
        invitedByUserId: admin.id,
        status: "pending",
        invitationToken: "token",
      },
      emailSent: true,
    });

    scopedRequest.mockImplementation(async (options: { path?: string; method?: string }) => {
      if (options.path === "/profiles" && options.method === "get") {
        return [fieldProfile];
      }
      if (options.path === "/technicians/t1/link-user" && options.method === "put") {
        return {
          id: "t1",
          userId: invitedUser.id,
          organizationId: "org-1",
          firstName: "Jean",
          lastName: "Dupont",
          email: "tech@test.fr",
          status: "actif",
        };
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

  it("should invite the user then link the technician", async () => {
    const result = await service.createTechnicianUserAccount(admin, "t1");

    expect(inviteUser).toHaveBeenCalledWith(admin, {
      email: "tech@test.fr",
      name: "Jean Dupont",
      role: "member",
      profileId: fieldProfile.id,
    });
    expect(scopedRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/technicians/t1/link-user",
        method: "put",
        body: { userId: invitedUser.id },
      }),
    );
    expect(result).toEqual({
      technician: expect.objectContaining({
        id: "t1",
        userId: invitedUser.id,
        linkedUser: expect.objectContaining({
          id: invitedUser.id,
          email: invitedUser.email,
          organizationMembershipStatus: "invited",
        }),
      }),
      emailSent: true,
      invitationId: "inv-1",
    });
  });

  it("should enrich getTechnician with linked user even when primary org differs", async () => {
    scopedRequest.mockImplementation(async (options: { path?: string; method?: string }) => {
      if (options.path === "/technicians/t1" && options.method === "get") {
        return {
          id: "t1",
          organizationId: "org-1",
          firstName: "Jean",
          lastName: "Dupont",
          email: "tech@test.fr",
          status: "actif",
          userId: invitedUser.id,
        };
      }
      if (options.path === `/users/${invitedUser.id}` && options.method === "get") {
        // Membership org-1 actif ; le document user peut avoir organizationId = org-2.
        return {
          ...invitedUser,
          organizationId: "org-1",
          organizationMembershipStatus: "active",
          status: "active",
        };
      }
      throw new Error(`Unexpected request: ${options.method} ${options.path}`);
    });

    const result = await service.getTechnician(admin, "t1");

    expect(result.linkedUser).toEqual(
      expect.objectContaining({
        id: invitedUser.id,
        organizationMembershipStatus: "active",
      }),
    );
  });

  it("should enrich getTechnician with linked user membership status", async () => {
    scopedRequest.mockImplementation(async (options: { path?: string; method?: string }) => {
      if (options.path === "/technicians/t1" && options.method === "get") {
        return {
          id: "t1",
          organizationId: "org-1",
          firstName: "Jean",
          lastName: "Dupont",
          email: "tech@test.fr",
          status: "actif",
          userId: invitedUser.id,
        };
      }
      if (options.path === `/users/${invitedUser.id}` && options.method === "get") {
        return { ...invitedUser, organizationMembershipStatus: "invited" };
      }
      throw new Error(`Unexpected request: ${options.method} ${options.path}`);
    });

    const result = await service.getTechnician(admin, "t1");

    expect(result.linkedUser).toEqual(
      expect.objectContaining({
        id: invitedUser.id,
        organizationMembershipStatus: "invited",
      }),
    );
  });

  it("should link an existing organization user to the technician", async () => {
    const activeUser: UserResponse = {
      ...invitedUser,
      id: "user-active-1",
      status: "active",
      organizationMembershipStatus: "active",
    };

    scopedRequest.mockImplementation(async (options: { path?: string; method?: string }) => {
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
      if (options.path === `/users/${activeUser.id}` && options.method === "get") {
        return activeUser;
      }
      if (
        options.path === `/users/${activeUser.id}/organization-memberships` &&
        options.method === "get"
      ) {
        return [
          {
            id: "m1",
            userId: activeUser.id,
            organizationId: "org-1",
            role: "member",
            membershipStatus: "active",
          },
        ];
      }
      if (options.path === `/technicians/by-user/${activeUser.id}` && options.method === "get") {
        return null;
      }
      if (options.path === "/technicians/t1/link-user" && options.method === "put") {
        return {
          id: "t1",
          organizationId: "org-1",
          firstName: "Jean",
          lastName: "Dupont",
          email: "tech@test.fr",
          status: "actif",
          userId: activeUser.id,
        };
      }
      throw new Error(`Unexpected request: ${options.method} ${options.path}`);
    });

    const result = await service.linkTechnicianUser(admin, "t1", activeUser.id);

    expect(result).toEqual(
      expect.objectContaining({
        userId: activeUser.id,
        linkedUser: expect.objectContaining({
          id: activeUser.id,
          organizationMembershipStatus: "active",
        }),
      }),
    );
  });

  it("should create the default technician profile when it does not exist yet", async () => {
    scopedRequest.mockImplementation(async (options: { path?: string; method?: string }) => {
      if (options.path === "/profiles" && options.method === "get") return [];
      if (options.path === "/profiles" && options.method === "post") return fieldProfile;
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
        return { id: "t1", userId: invitedUser.id, organizationId: "org-1" };
      }
      throw new Error(`Unexpected request: ${options.method} ${options.path}`);
    });

    await service.createTechnicianUserAccount(admin, "t1");

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
    expect(inviteUser).toHaveBeenCalledWith(
      admin,
      expect.objectContaining({ profileId: fieldProfile.id }),
    );
  });
});
