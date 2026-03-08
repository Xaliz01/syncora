import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { ConflictException, NotFoundException, BadRequestException } from "@nestjs/common";
import { PermissionsService } from "./permissions.service";
import { AbstractPermissionsService } from "./ports/permissions.service.port";
import { AVAILABLE_PERMISSION_CODES } from "@syncora/shared";

describe("PermissionsService", () => {
  let service: PermissionsService;
  let mockPermissionProfileModel: Record<string, jest.Mock>;
  let mockUserAssignmentModel: Record<string, jest.Mock>;
  let mockInvitationModel: Record<string, jest.Mock>;

  const createExecMock = (value: unknown) => ({
    exec: jest.fn().mockResolvedValue(value)
  });

  const mockProfileDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: { toString: () => "profile-123" },
    organizationId: "org-1",
    name: "Test Profile",
    description: "A profile",
    permissions: ["users.read", "cases.read"],
    get: jest.fn((key: string) => {
      if (key === "createdAt") return new Date("2025-01-01");
      if (key === "updatedAt") return new Date("2025-01-02");
      return undefined;
    }),
    ...overrides
  });

  const mockAssignmentDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: { toString: () => "assign-123" },
    organizationId: "org-1",
    userId: "user-1",
    profileId: "profile-123",
    extraPermissions: [],
    revokedPermissions: [],
    get: jest.fn((key: string) => (key === "updatedAt" ? new Date("2025-01-02") : undefined)),
    ...overrides
  });

  const mockInvitationDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: { toString: () => "inv-123" },
    organizationId: "org-1",
    invitedUserId: "user-1",
    invitedEmail: "invited@example.com",
    invitedName: "Invited",
    invitedByUserId: "admin-1",
    status: "pending",
    invitationToken: "token-abc",
    profileId: undefined,
    extraPermissions: [],
    revokedPermissions: [],
    acceptedAt: undefined,
    get: jest.fn((key: string) => (key === "createdAt" ? new Date("2025-01-01") : undefined)),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides
  });

  beforeEach(async () => {
    mockPermissionProfileModel = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      deleteOne: jest.fn()
    };
    mockUserAssignmentModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 })
    };
    mockInvitationModel = {
      create: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 })
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: AbstractPermissionsService, useClass: PermissionsService },
        { provide: getModelToken("PermissionProfile"), useValue: mockPermissionProfileModel },
        {
          provide: getModelToken("UserPermissionAssignment"),
          useValue: mockUserAssignmentModel
        },
        { provide: getModelToken("Invitation"), useValue: mockInvitationModel }
      ]
    }).compile();

    service = module.get<PermissionsService>(AbstractPermissionsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createProfile", () => {
    it("should create a profile and return response", async () => {
      const doc = mockProfileDoc({
        permissions: ["users.read", "cases.read"]
      });
      mockPermissionProfileModel.create.mockResolvedValue(doc);

      const result = await service.createProfile({
        organizationId: "org-1",
        name: "Test Profile",
        description: "A profile",
        permissions: ["users.read", "cases.read"]
      });

      expect(mockPermissionProfileModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-1",
          name: "Test Profile",
          description: "A profile",
          permissions: ["users.read", "cases.read"]
        })
      );
      expect(result).toMatchObject({
        id: "profile-123",
        organizationId: "org-1",
        name: "Test Profile",
        permissions: expect.arrayContaining(["users.read", "cases.read"])
      });
    });

    it("should throw ConflictException on duplicate key error", async () => {
      const err = { code: 11000 };
      mockPermissionProfileModel.create.mockRejectedValue(err);

      await expect(
        service.createProfile({
          organizationId: "org-1",
          name: "Duplicate",
          permissions: ["users.read"]
        })
      ).rejects.toThrow(ConflictException);
      await expect(
        service.createProfile({
          organizationId: "org-1",
          name: "Duplicate",
          permissions: ["users.read"]
        })
      ).rejects.toThrow("Profile name already exists in organization");
    });

    it("should throw BadRequestException for unknown permissions", async () => {
      await expect(
        service.createProfile({
          organizationId: "org-1",
          name: "Bad Profile",
          permissions: ["users.read", "invalid.permission" as never]
        })
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createProfile({
          organizationId: "org-1",
          name: "Bad Profile",
          permissions: ["users.read", "invalid.permission" as never]
        })
      ).rejects.toThrow("Unknown permissions");
    });
  });

  describe("listProfiles", () => {
    it("should return profiles sorted by createdAt", async () => {
      const docs = [mockProfileDoc(), mockProfileDoc({ _id: { toString: () => "profile-456" } })];
      mockPermissionProfileModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue(createExecMock(docs))
      });

      const result = await service.listProfiles("org-1");

      expect(mockPermissionProfileModel.find).toHaveBeenCalledWith({ organizationId: "org-1" });
      expect(result).toHaveLength(2);
    });
  });

  describe("findProfileById", () => {
    it("should return profile when found", async () => {
      const doc = mockProfileDoc();
      mockPermissionProfileModel.findOne.mockReturnValue(createExecMock(doc));

      const result = await service.findProfileById("profile-123", "org-1");

      expect(mockPermissionProfileModel.findOne).toHaveBeenCalledWith({
        _id: "profile-123",
        organizationId: "org-1"
      });
      expect(result.id).toBe("profile-123");
    });

    it("should throw NotFoundException when profile not found", async () => {
      mockPermissionProfileModel.findOne.mockReturnValue(createExecMock(null));

      await expect(service.findProfileById("non-existent", "org-1")).rejects.toThrow(
        NotFoundException
      );
      await expect(service.findProfileById("non-existent", "org-1")).rejects.toThrow(
        "Profile not found"
      );
    });
  });

  describe("deleteProfile", () => {
    it("should delete profile and return { deleted: true }", async () => {
      mockPermissionProfileModel.deleteOne.mockReturnValue(
        createExecMock({ deletedCount: 1 })
      );

      const result = await service.deleteProfile("profile-123", "org-1");

      expect(mockPermissionProfileModel.deleteOne).toHaveBeenCalledWith({
        _id: "profile-123",
        organizationId: "org-1"
      });
      expect(mockUserAssignmentModel.updateMany).toHaveBeenCalled();
      expect(mockInvitationModel.updateMany).toHaveBeenCalled();
      expect(result).toEqual({ deleted: true });
    });

    it("should throw NotFoundException when profile not found", async () => {
      mockPermissionProfileModel.deleteOne.mockReturnValue(
        createExecMock({ deletedCount: 0 })
      );

      await expect(service.deleteProfile("non-existent", "org-1")).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe("assignUserPermissions", () => {
    it("should assign permissions and return assignment response", async () => {
      const profileDoc = mockProfileDoc({ permissions: ["users.read"] });
      const assignmentDoc = mockAssignmentDoc({ profileId: "profile-123" });
      mockPermissionProfileModel.findOne.mockReturnValue(createExecMock(profileDoc));
      mockUserAssignmentModel.findOneAndUpdate.mockReturnValue(
        createExecMock(assignmentDoc)
      );

      const result = await service.assignUserPermissions({
        organizationId: "org-1",
        userId: "user-1",
        profileId: "profile-123",
        extraPermissions: ["cases.read"],
        revokedPermissions: []
      });

      expect(mockUserAssignmentModel.findOneAndUpdate).toHaveBeenCalled();
      expect(result).toMatchObject({
        organizationId: "org-1",
        userId: "user-1",
        profileId: "profile-123"
      });
    });

    it("should throw NotFoundException when profile not found in organization", async () => {
      mockPermissionProfileModel.findOne.mockReturnValue(createExecMock(null));

      await expect(
        service.assignUserPermissions({
          organizationId: "org-1",
          userId: "user-1",
          profileId: "non-existent"
        })
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.assignUserPermissions({
          organizationId: "org-1",
          userId: "user-1",
          profileId: "non-existent"
        })
      ).rejects.toThrow("Profile not found in this organization");
    });
  });

  describe("getUserAssignment", () => {
    it("should return assignment when exists", async () => {
      const assignmentDoc = mockAssignmentDoc({ profileId: "profile-123" });
      const profileDoc = mockProfileDoc({ permissions: ["users.read"] });
      mockUserAssignmentModel.findOne.mockReturnValue(createExecMock(assignmentDoc));
      mockPermissionProfileModel.findOne.mockReturnValue(createExecMock(profileDoc));

      const result = await service.getUserAssignment("org-1", "user-1");

      expect(mockUserAssignmentModel.findOne).toHaveBeenCalledWith({
        organizationId: "org-1",
        userId: "user-1"
      });
      expect(result).toMatchObject({
        organizationId: "org-1",
        userId: "user-1",
        effectivePermissions: expect.any(Array)
      });
    });

    it("should return empty assignment when none exists", async () => {
      mockUserAssignmentModel.findOne.mockReturnValue(createExecMock(null));

      const result = await service.getUserAssignment("org-1", "user-1");

      expect(result).toEqual({
        organizationId: "org-1",
        userId: "user-1",
        extraPermissions: [],
        revokedPermissions: [],
        effectivePermissions: []
      });
    });
  });

  describe("resolveEffectivePermissions", () => {
    it("should return all permissions for admin role", async () => {
      const result = await service.resolveEffectivePermissions({
        organizationId: "org-1",
        userId: "user-1",
        role: "admin"
      });

      expect(result.permissions).toEqual([...AVAILABLE_PERMISSION_CODES]);
      expect(mockUserAssignmentModel.findOne).not.toHaveBeenCalled();
    });

    it("should merge profile and assignment for member role", async () => {
      const assignmentDoc = mockAssignmentDoc({
        profileId: "profile-123",
        extraPermissions: ["cases.create"],
        revokedPermissions: []
      });
      const profileDoc = mockProfileDoc({
        permissions: ["users.read", "cases.read"]
      });
      mockUserAssignmentModel.findOne.mockReturnValue(createExecMock(assignmentDoc));
      mockPermissionProfileModel.findOne.mockReturnValue(createExecMock(profileDoc));

      const result = await service.resolveEffectivePermissions({
        organizationId: "org-1",
        userId: "user-1",
        role: "member"
      });

      expect(mockUserAssignmentModel.findOne).toHaveBeenCalledWith({
        organizationId: "org-1",
        userId: "user-1"
      });
      expect(result.permissions).toEqual(
        expect.arrayContaining(["users.read", "cases.read", "cases.create"])
      );
    });

    it("should exclude revoked permissions for member", async () => {
      const assignmentDoc = mockAssignmentDoc({
        profileId: "profile-123",
        extraPermissions: [],
        revokedPermissions: ["cases.delete"]
      });
      const profileDoc = mockProfileDoc({
        permissions: ["users.read", "cases.read", "cases.delete"]
      });
      mockUserAssignmentModel.findOne.mockReturnValue(createExecMock(assignmentDoc));
      mockPermissionProfileModel.findOne.mockReturnValue(createExecMock(profileDoc));

      const result = await service.resolveEffectivePermissions({
        organizationId: "org-1",
        userId: "user-1",
        role: "member"
      });

      expect(result.permissions).not.toContain("cases.delete");
      expect(result.permissions).toContain("users.read");
    });

    it("should return default permissions when no assignment exists for member", async () => {
      mockUserAssignmentModel.findOne.mockReturnValue(createExecMock(null));

      const result = await service.resolveEffectivePermissions({
        organizationId: "org-1",
        userId: "user-1",
        role: "member"
      });

      expect(result.permissions).toEqual([]);
    });
  });

  describe("createInvitation", () => {
    it("should create invitation and return response", async () => {
      const doc = mockInvitationDoc();
      mockInvitationModel.create.mockResolvedValue(doc);

      const result = await service.createInvitation({
        organizationId: "org-1",
        invitedUserId: "user-1",
        invitedEmail: "invited@example.com",
        invitedName: "Invited",
        invitedByUserId: "admin-1"
      });

      expect(mockInvitationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-1",
          invitedUserId: "user-1",
          invitedEmail: "invited@example.com",
          invitedName: "Invited",
          invitedByUserId: "admin-1",
          status: "pending"
        })
      );
      expect(result).toMatchObject({
        id: "inv-123",
        organizationId: "org-1",
        invitedEmail: "invited@example.com",
        status: "pending"
      });
    });

    it("should throw NotFoundException when profile not found", async () => {
      mockPermissionProfileModel.findOne.mockReturnValue(createExecMock(null));

      await expect(
        service.createInvitation({
          organizationId: "org-1",
          invitedUserId: "user-1",
          invitedEmail: "invited@example.com",
          invitedByUserId: "admin-1",
          profileId: "non-existent"
        })
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ConflictException on duplicate key", async () => {
      mockInvitationModel.create.mockRejectedValue({ code: 11000 });

      await expect(
        service.createInvitation({
          organizationId: "org-1",
          invitedUserId: "user-1",
          invitedEmail: "invited@example.com",
          invitedByUserId: "admin-1"
        })
      ).rejects.toThrow(ConflictException);
      await expect(
        service.createInvitation({
          organizationId: "org-1",
          invitedUserId: "user-1",
          invitedEmail: "invited@example.com",
          invitedByUserId: "admin-1"
        })
      ).rejects.toThrow("A pending invitation already exists for this email");
    });
  });

  describe("resolveInvitation", () => {
    it("should return invitation when found and pending", async () => {
      const doc = mockInvitationDoc({ status: "pending" });
      mockInvitationModel.findOne.mockReturnValue(createExecMock(doc));

      const result = await service.resolveInvitation("token-abc");

      expect(mockInvitationModel.findOne).toHaveBeenCalledWith({
        invitationToken: "token-abc"
      });
      expect(result).toMatchObject({
        id: "inv-123",
        invitationToken: "token-abc",
        status: "pending"
      });
    });

    it("should throw NotFoundException when invitation not found", async () => {
      mockInvitationModel.findOne.mockReturnValue(createExecMock(null));

      await expect(service.resolveInvitation("invalid-token")).rejects.toThrow(NotFoundException);
      await expect(service.resolveInvitation("invalid-token")).rejects.toThrow(
        "Invitation not found"
      );
    });

    it("should throw ConflictException when invitation already processed", async () => {
      const doc = mockInvitationDoc({ status: "accepted" });
      mockInvitationModel.findOne.mockReturnValue(createExecMock(doc));

      await expect(service.resolveInvitation("token-abc")).rejects.toThrow(ConflictException);
      await expect(service.resolveInvitation("token-abc")).rejects.toThrow(
        "Invitation has already been processed"
      );
    });
  });

  describe("acceptInvitation", () => {
    it("should accept invitation and return response", async () => {
      const doc = mockInvitationDoc({ status: "pending" });
      mockInvitationModel.findOne.mockReturnValue(
        createExecMock(doc)
      );

      const result = await service.acceptInvitation("token-abc");

      expect(mockInvitationModel.findOne).toHaveBeenCalledWith({
        invitationToken: "token-abc",
        status: "pending"
      });
      expect(doc.status).toBe("accepted");
      expect(doc.acceptedAt).toBeDefined();
      expect(doc.save).toHaveBeenCalled();
      expect(result).toMatchObject({ status: "accepted" });
    });

    it("should throw NotFoundException when pending invitation not found", async () => {
      mockInvitationModel.findOne.mockReturnValue(createExecMock(null));

      await expect(service.acceptInvitation("invalid-token")).rejects.toThrow(NotFoundException);
      await expect(service.acceptInvitation("invalid-token")).rejects.toThrow(
        "Pending invitation not found"
      );
    });
  });
});
