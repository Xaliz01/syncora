import { Test, TestingModule } from "@nestjs/testing";
import type {
  AuthUser,
  PermissionProfileResponse,
  TechnicianResponse,
  UserResponse,
} from "@planwise/shared";
import {
  TECHNICIAN_FIELD_DEFAULT_PERMISSIONS,
  TECHNICIAN_FIELD_PROFILE_NAME,
} from "@planwise/shared";
import { TechniciansGatewayService } from "../technicians.service";
import { OrganizationScopedHttpClient } from "../../infrastructure/organization-scoped-http.client";
import { AbstractAdminService } from "../ports/admin.service.port";
import { AbstractTechniciansService } from "../technicians/ports/technicians.service.port";

describe("TechniciansGatewayService", () => {
  let service: TechniciansGatewayService;
  const scopedRequest = jest.fn();
  const inviteUser = jest.fn();
  const getTechnician = jest.fn();
  const linkUserToTechnician = jest.fn();
  const findByUserId = jest.fn();

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

  const technician: TechnicianResponse = {
    id: "t1",
    organizationId: "org-1",
    firstName: "Jean",
    lastName: "Dupont",
    email: "tech@test.fr",
    status: "actif",
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
        {
          provide: AbstractTechniciansService,
          useValue: { getTechnician, linkUserToTechnician, findByUserId },
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

    getTechnician.mockResolvedValue(technician);
    linkUserToTechnician.mockResolvedValue({ ...technician, userId: invitedUser.id });
    findByUserId.mockResolvedValue(null);

    scopedRequest.mockImplementation(async (options: { path?: string; method?: string }) => {
      if (options.path === "/profiles" && options.method === "get") {
        return [fieldProfile];
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
    expect(linkUserToTechnician).toHaveBeenCalledWith("org-1", "t1", invitedUser.id);
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
    getTechnician.mockResolvedValue({ ...technician, userId: invitedUser.id });
    scopedRequest.mockImplementation(async (options: { path?: string; method?: string }) => {
      if (options.path === `/users/${invitedUser.id}` && options.method === "get") {
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
    getTechnician.mockResolvedValue({ ...technician, userId: invitedUser.id });
    scopedRequest.mockImplementation(async (options: { path?: string; method?: string }) => {
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
    linkUserToTechnician.mockResolvedValue({ ...technician, userId: activeUser.id });

    scopedRequest.mockImplementation(async (options: { path?: string; method?: string }) => {
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
      throw new Error(`Unexpected request: ${options.method} ${options.path}`);
    });

    const result = await service.linkTechnicianUser(admin, "t1", activeUser.id);

    expect(findByUserId).toHaveBeenCalledWith("org-1", activeUser.id);
    expect(linkUserToTechnician).toHaveBeenCalledWith("org-1", "t1", activeUser.id);
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
