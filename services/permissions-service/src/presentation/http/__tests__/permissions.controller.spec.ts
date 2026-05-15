import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import type { PermissionCode } from "@syncora/shared";
import { PermissionsController } from "../permissions.controller";
import { AbstractPermissionsService } from "../../../domain/ports/permissions.service.port";

describe("PermissionsController", () => {
  let controller: PermissionsController;
  let mockPermissionsService: jest.Mocked<AbstractPermissionsService>;

  beforeEach(async () => {
    mockPermissionsService = {
      createProfile: jest.fn(),
      listProfiles: jest.fn(),
      findProfileById: jest.fn(),
      updateProfile: jest.fn(),
      deleteProfile: jest.fn(),
      assignUserPermissions: jest.fn(),
      getUserAssignment: jest.fn(),
      resolveEffectivePermissions: jest.fn(),
      createInvitation: jest.fn(),
      listInvitations: jest.fn(),
      resolveInvitation: jest.fn(),
      acceptInvitation: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PermissionsController],
      providers: [
        {
          provide: AbstractPermissionsService,
          useValue: mockPermissionsService,
        },
      ],
    }).compile();

    controller = module.get<PermissionsController>(PermissionsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("createProfile", () => {
    it("should call service.createProfile and return the result", async () => {
      const body = {
        organizationId: "org-1",
        name: "Test Profile",
        description: "A profile",
        permissions: ["users.read", "cases.read"] as PermissionCode[],
      };
      const expected = {
        id: "profile-123",
        organizationId: "org-1",
        name: "Test Profile",
        description: "A profile",
        permissions: ["users.read", "cases.read"] as PermissionCode[],
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-02T00:00:00.000Z",
      };
      mockPermissionsService.createProfile.mockResolvedValue(expected);

      const result = await controller.createProfile(body);

      expect(mockPermissionsService.createProfile).toHaveBeenCalledWith(body);
      expect(result).toEqual(expected);
    });
  });

  describe("listProfiles", () => {
    it("should call service.listProfiles when organizationId is provided", async () => {
      const profiles = [
        {
          id: "profile-1",
          organizationId: "org-1",
          name: "Profile 1",
          permissions: ["users.read"] as PermissionCode[],
          createdAt: "2025-01-01T00:00:00.000Z",
          updatedAt: "2025-01-02T00:00:00.000Z",
        },
      ];
      mockPermissionsService.listProfiles.mockResolvedValue(profiles);

      const result = await controller.listProfiles("org-1");

      expect(mockPermissionsService.listProfiles).toHaveBeenCalledWith("org-1");
      expect(result).toEqual(profiles);
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(controller.listProfiles("")).rejects.toThrow(BadRequestException);
      await expect(controller.listProfiles("")).rejects.toThrow(
        "organizationId query param is required",
      );
    });
  });

  describe("findProfileById", () => {
    it("should call service.findProfileById and return the result", async () => {
      const profile = {
        id: "profile-123",
        organizationId: "org-1",
        name: "Test Profile",
        permissions: ["users.read"] as PermissionCode[],
        createdAt: "2025-01-01T00:00:00.000Z",
        updatedAt: "2025-01-02T00:00:00.000Z",
      };
      mockPermissionsService.findProfileById.mockResolvedValue(profile);

      const result = await controller.findProfileById("profile-123", "org-1");

      expect(mockPermissionsService.findProfileById).toHaveBeenCalledWith("profile-123", "org-1");
      expect(result).toEqual(profile);
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(controller.findProfileById("profile-123", "")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("assignUserPermissions", () => {
    it("should call service.assignUserPermissions with userId from param", async () => {
      const body = {
        organizationId: "org-1",
        userId: "user-123",
        profileId: "profile-1",
        extraPermissions: ["cases.read"] as PermissionCode[],
        revokedPermissions: [] as PermissionCode[],
      };
      const expected = {
        organizationId: "org-1",
        userId: "user-123",
        profileId: "profile-1",
        extraPermissions: ["cases.read"] as PermissionCode[],
        revokedPermissions: [] as PermissionCode[],
        effectivePermissions: ["users.read", "cases.read"] as PermissionCode[],
        updatedAt: "2025-01-02T00:00:00.000Z",
      };
      mockPermissionsService.assignUserPermissions.mockResolvedValue(expected);

      const result = await controller.assignUserPermissions("user-123", body);

      expect(mockPermissionsService.assignUserPermissions).toHaveBeenCalledWith({
        ...body,
        userId: "user-123",
      });
      expect(result).toEqual(expected);
    });
  });

  describe("resolveEffectivePermissions", () => {
    it("should call service.resolveEffectivePermissions and return the result", async () => {
      const body = {
        organizationId: "org-1",
        userId: "user-1",
        role: "admin" as const,
      };
      const expected = {
        permissions: [
          "users.read",
          "users.invite",
          "users.assign_profile",
          "users.manage_permissions",
          "profiles.read",
          "profiles.create",
          "profiles.update",
          "profiles.delete",
          "cases.read",
          "cases.create",
          "cases.update",
          "cases.delete",
          "cases.assign",
          "case_templates.read",
          "case_templates.create",
          "case_templates.update",
          "case_templates.delete",
          "interventions.read",
          "interventions.create",
          "interventions.update",
          "interventions.delete",
        ] as PermissionCode[],
      };
      mockPermissionsService.resolveEffectivePermissions.mockResolvedValue(expected);

      const result = await controller.resolveEffectivePermissions(body);

      expect(mockPermissionsService.resolveEffectivePermissions).toHaveBeenCalledWith(body);
      expect(result).toEqual(expected);
    });
  });

  describe("createInvitation", () => {
    it("should call service.createInvitation and return the result", async () => {
      const body = {
        organizationId: "org-1",
        invitedUserId: "user-1",
        invitedEmail: "invited@example.com",
        invitedName: "Invited User",
        invitedByUserId: "admin-1",
      };
      const expected = {
        id: "inv-123",
        organizationId: "org-1",
        invitedUserId: "user-1",
        invitedEmail: "invited@example.com",
        invitedName: "Invited User",
        invitedByUserId: "admin-1",
        status: "pending" as const,
        invitationToken: "token-abc",
        extraPermissions: [] as PermissionCode[],
        revokedPermissions: [] as PermissionCode[],
        createdAt: "2025-01-01T00:00:00.000Z",
      };
      mockPermissionsService.createInvitation.mockResolvedValue(expected);

      const result = await controller.createInvitation(body);

      expect(mockPermissionsService.createInvitation).toHaveBeenCalledWith(body);
      expect(result).toEqual(expected);
    });
  });
});
