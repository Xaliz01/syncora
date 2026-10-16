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
import { AbstractAdminService } from "../ports/admin.service.port";
import { AbstractTechniciansService } from "../technicians/ports/technicians.service.port";
import { AbstractUsersService } from "../users/ports/users.service.port";
import { AbstractPermissionsService } from "../permissions/ports/permissions.service.port";

describe("TechniciansGatewayService", () => {
  let service: TechniciansGatewayService;
  const findById = jest.fn();
  const listOrganizationMemberships = jest.fn();
  const listProfiles = jest.fn();
  const createProfile = jest.fn();
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
          provide: AbstractAdminService,
          useValue: { inviteUser },
        },
        {
          provide: AbstractTechniciansService,
          useValue: { getTechnician, linkUserToTechnician, findByUserId },
        },
        {
          provide: AbstractUsersService,
          useValue: { findById, listOrganizationMemberships },
        },
        {
          provide: AbstractPermissionsService,
          useValue: { listProfiles, createProfile },
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

    listProfiles.mockResolvedValue([fieldProfile]);
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
    findById.mockResolvedValue({
      ...invitedUser,
      organizationId: "org-1",
      organizationMembershipStatus: "active",
      status: "active",
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
    findById.mockResolvedValue({ ...invitedUser, organizationMembershipStatus: "invited" });

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

    findById.mockResolvedValue(activeUser);
    listOrganizationMemberships.mockResolvedValue([
      {
        id: "m1",
        userId: activeUser.id,
        organizationId: "org-1",
        role: "member",
        membershipStatus: "active",
      },
    ]);

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
    listProfiles.mockResolvedValue([]);
    createProfile.mockResolvedValue(fieldProfile);

    await service.createTechnicianUserAccount(admin, "t1");

    expect(createProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        name: TECHNICIAN_FIELD_PROFILE_NAME,
        permissions: [...TECHNICIAN_FIELD_DEFAULT_PERMISSIONS],
      }),
    );
    expect(inviteUser).toHaveBeenCalledWith(
      admin,
      expect.objectContaining({ profileId: fieldProfile.id }),
    );
  });
});
