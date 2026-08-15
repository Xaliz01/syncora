import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import {
  activeDocumentFilter,
  DEFAULT_QUICK_ACTIONS,
  migrateQuickActionIdsToBookmarks,
} from "@planwise/shared";
import { UsersService } from "../users.service";
import { UserSessionsService } from "../user-sessions.service";
import { UserPreferencesService } from "../user-preferences.service";
import { ProspectOutreachService } from "../prospect-outreach.service";
import { AbstractUsersService } from "../ports/users.service.port";
import { AbstractUserSessionsService } from "../ports/user-sessions.service.port";
import { AbstractUserPreferencesService } from "../ports/user-preferences.service.port";
import { AbstractProspectOutreachService } from "../ports/prospect-outreach.service.port";

const defaultQuickActions = DEFAULT_QUICK_ACTIONS.map((b) => ({ ...b }));
const bookmarksFrom = (ids: string[]) => migrateQuickActionIdsToBookmarks(ids)!;

jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashed"),
  compare: jest.fn(),
}));

const mockDoc = (overrides: Record<string, unknown> = {}) => ({
  _id: { toString: () => "user-123" },
  organizationId: "org-1",
  email: "user@example.com",
  passwordHash: "hashed",
  name: "Test User",
  status: "active",
  get: jest.fn((key: string) => (key === "createdAt" ? new Date("2025-01-01") : undefined)),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const mockMemDoc = (overrides: Record<string, unknown> = {}) => ({
  _id: { toString: () => "mem-1" },
  userId: "user-123",
  organizationId: "org-1",
  role: "member",
  membershipStatus: "active",
  deletedAt: null,
  save: jest.fn().mockResolvedValue(undefined),
  get: jest.fn((key: string) => {
    if (key === "createdAt") return new Date("2025-01-01");
    if (key === "updatedAt") return new Date("2025-01-01");
    return undefined;
  }),
  ...overrides,
});

describe("UsersService", () => {
  let service: UsersService;
  let mockUserModel: {
    create: jest.Mock;
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
    find: jest.Mock;
    updateOne: jest.Mock;
    countDocuments: jest.Mock;
    collection: { findOne: jest.Mock; updateOne: jest.Mock };
  };
  let mockMembershipModel: {
    findOneAndUpdate: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    countDocuments: jest.Mock;
    updateMany: jest.Mock;
  };
  let mockSessionsService: {
    revokeSession: jest.Mock;
    getLatestLastSeenByUserIds: jest.Mock;
    listUserIdsActiveSince: jest.Mock;
    listAllDistinctUserIdsActiveSince: jest.Mock;
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockResolvedValue("hashed");
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const execMock = jest.fn();
    const sortMock = jest.fn().mockReturnValue({ exec: execMock });
    mockUserModel = {
      create: jest.fn(),
      findOne: jest.fn().mockReturnValue({ exec: execMock }),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: execMock }),
      find: jest.fn().mockReturnValue({ sort: sortMock }),
      updateOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
      countDocuments: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(0) }),
      collection: {
        findOne: jest.fn(),
        updateOne: jest.fn().mockResolvedValue(undefined),
      },
    };

    mockMembershipModel = {
      findOneAndUpdate: jest.fn().mockResolvedValue(mockMemDoc()),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
        exec: jest.fn().mockResolvedValue([mockMemDoc({ role: "member" })]),
      }),
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMemDoc({ role: "member" })),
      }),
      countDocuments: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      }),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };

    mockSessionsService = {
      revokeSession: jest.fn().mockResolvedValue(undefined),
      getLatestLastSeenByUserIds: jest.fn().mockResolvedValue({}),
      listUserIdsActiveSince: jest.fn().mockResolvedValue({ userIds: [], total: 0 }),
      listAllDistinctUserIdsActiveSince: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: AbstractUsersService, useClass: UsersService },
        { provide: AbstractUserSessionsService, useValue: mockSessionsService },
        { provide: getModelToken("User"), useValue: mockUserModel },
        { provide: getModelToken("OrganizationMembership"), useValue: mockMembershipModel },
      ],
    }).compile();

    service = module.get<UsersService>(AbstractUsersService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a user with hashed password and membership (role on membership only)", async () => {
      mockUserModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      const doc = mockDoc({ email: "new@example.com", name: "New User" });
      mockUserModel.create.mockResolvedValue(doc);

      const body = {
        organizationId: "org-1",
        email: "new@example.com",
        password: "secret123",
        name: "New User",
        role: "member" as const,
      };
      const result = await service.create(body);

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        email: "new@example.com",
        ...activeDocumentFilter,
      });
      expect(bcrypt.hash).toHaveBeenCalledWith("secret123", 12);
      expect(mockUserModel.create).toHaveBeenCalledWith({
        organizationId: "org-1",
        email: "new@example.com",
        passwordHash: "hashed",
        name: "New User",
        status: "active",
        emailVerified: true,
      });
      expect(mockMembershipModel.findOneAndUpdate).toHaveBeenCalled();
      expect(result).toMatchObject({
        id: "user-123",
        organizationId: "org-1",
        email: "new@example.com",
        name: "New User",
        role: "member",
        status: "active",
      });
    });

    it("should throw ConflictException when email already exists", async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDoc()),
      });

      await expect(
        service.create({
          organizationId: "org-1",
          email: "existing@example.com",
          password: "secret123",
          role: "member",
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("createAccount", () => {
    it("should create an account without organizationId and issue email OTP", async () => {
      mockUserModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      const doc = mockDoc({
        email: "solo@example.com",
        name: "Solo",
        organizationId: undefined,
        emailVerified: false,
      });
      mockUserModel.create.mockResolvedValue(doc);

      const result = await service.createAccount({
        email: "solo@example.com",
        password: "secret123",
        name: "Solo",
      });

      expect(mockUserModel.create).toHaveBeenCalledWith({
        email: "solo@example.com",
        passwordHash: "hashed",
        name: "Solo",
        status: "active",
        emailVerified: false,
      });
      expect(mockMembershipModel.findOneAndUpdate).not.toHaveBeenCalled();
      expect(doc.save).toHaveBeenCalled();
      expect(result.user).toEqual({
        id: "user-123",
        email: "solo@example.com",
        name: "Solo",
        status: "active",
        emailVerified: false,
      });
      expect(result.emailVerificationCode).toMatch(/^\d{6}$/);
    });

    it("should reject weak passwords", async () => {
      await expect(
        service.createAccount({
          email: "solo@example.com",
          password: "short",
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("verifyEmail", () => {
    it("should verify a valid OTP", async () => {
      const doc = mockDoc({
        email: "solo@example.com",
        emailVerified: false,
        emailVerificationCodeHash: "hashed-otp",
        emailVerificationExpiresAt: new Date(Date.now() + 60_000),
        organizationId: undefined,
      });
      mockUserModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.verifyEmail("solo@example.com", "123456");

      expect(result.emailVerified).toBe(true);
      expect((doc as { emailVerified?: boolean }).emailVerified).toBe(true);
      expect(doc.save).toHaveBeenCalled();
    });

    it("should reject invalid OTP", async () => {
      const doc = mockDoc({
        email: "solo@example.com",
        emailVerified: false,
        emailVerificationCodeHash: "hashed-otp",
        emailVerificationExpiresAt: new Date(Date.now() + 60_000),
      });
      mockUserModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(doc) });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.verifyEmail("solo@example.com", "000000")).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe("patch", () => {
    it("should update organizationId only (role stays on membership)", async () => {
      const execMock = jest.fn().mockResolvedValue(mockDoc({ organizationId: "org-new" }));
      mockUserModel.findOneAndUpdate.mockReturnValue({ exec: execMock });
      mockMembershipModel.findOne.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue(mockMemDoc({ organizationId: "org-new", role: "member" })),
      });

      const result = await service.patch("user-123", { organizationId: "org-new" });

      expect(mockUserModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: "user-123", ...activeDocumentFilter },
        { $set: { organizationId: "org-new" } },
        { new: true },
      );
      expect(result.organizationId).toBe("org-new");
      expect(result.role).toBe("member");
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(service.patch("user-123", {})).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException when user does not exist", async () => {
      const execMock = jest.fn().mockResolvedValue(null);
      mockUserModel.findOneAndUpdate.mockReturnValue({ exec: execMock });

      await expect(service.patch("user-123", { organizationId: "org-x" })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("invite", () => {
    it("should create user active without password and membership invited", async () => {
      mockUserModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      const doc = mockDoc({
        status: "active",
        passwordHash: undefined,
        email: "invited@example.com",
        name: "Invited User",
      });
      mockUserModel.create.mockResolvedValue(doc);

      const body = {
        organizationId: "org-1",
        email: "invited@example.com",
        name: "Invited User",
        role: "member" as const,
        invitedByUserId: "admin-1",
      };
      const result = await service.invite(body);

      expect(mockMembershipModel.findOneAndUpdate).toHaveBeenCalled();
      expect(result.status).toBe("active");
    });

    it("should reuse existing user and add invited membership for another organization", async () => {
      const existing = mockDoc({
        email: "invited@example.com",
        organizationId: "org-1",
      });
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existing),
      });
      mockMembershipModel.findOne
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue(null),
        })
        .mockReturnValueOnce({
          exec: jest
            .fn()
            .mockResolvedValue(
              mockMemDoc({ organizationId: "org-2", membershipStatus: "invited", role: "member" }),
            ),
        });

      const result = await service.invite({
        organizationId: "org-2",
        email: "invited@example.com",
        role: "member",
        invitedByUserId: "admin-2",
      });

      expect(mockUserModel.create).not.toHaveBeenCalled();
      expect(mockMembershipModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: "user-123", organizationId: "org-2" },
        expect.objectContaining({
          $set: expect.objectContaining({ membershipStatus: "invited", role: "member" }),
        }),
        expect.any(Object),
      );
      expect(result.id).toBe("user-123");
    });

    it("should throw when user is already an active member of the organization", async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDoc({ email: "invited@example.com" })),
      });
      mockMembershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMemDoc({ membershipStatus: "active" })),
      });

      await expect(
        service.invite({
          organizationId: "org-1",
          email: "invited@example.com",
          invitedByUserId: "admin-1",
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("activateInvitedUser", () => {
    it("should set password and activate membership when pending invite exists", async () => {
      const doc = mockDoc({
        passwordHash: undefined,
        organizationId: "org-1",
        save: jest.fn().mockImplementation(function (this: typeof doc) {
          return Promise.resolve(this);
        }),
      });
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });
      mockMembershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMemDoc({ membershipStatus: "invited" })),
      });

      const result = await service.activateInvitedUser("user-123", {
        password: "new-password1",
        name: "Activated",
        organizationId: "org-1",
      });

      expect(bcrypt.hash).toHaveBeenCalledWith("new-password1", expect.any(Number));
      expect(doc.save).toHaveBeenCalled();
      expect(mockMembershipModel.updateMany).toHaveBeenCalled();
      expect(result.status).toBe("active");
    });

    it("should verify existing password when activating a second organization invite", async () => {
      const doc = mockDoc({
        passwordHash: "hashed",
        organizationId: "org-1",
        save: jest.fn().mockImplementation(function (this: typeof doc) {
          return Promise.resolve(this);
        }),
      });
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });
      mockMembershipModel.findOne.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue(mockMemDoc({ organizationId: "org-2", membershipStatus: "invited" })),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.activateInvitedUser("user-123", {
        password: "existing-pass1",
        organizationId: "org-2",
      });

      expect(bcrypt.compare).toHaveBeenCalledWith("existing-pass1", "hashed");
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(doc.organizationId).toBe("org-2");
      expect(doc.status).toBe("active");
      expect(result.organizationId).toBe("org-2");
    });

    it("should skip password when trusted authenticated session matches the invitee", async () => {
      const doc = mockDoc({
        passwordHash: "hashed",
        organizationId: "org-1",
        save: jest.fn().mockImplementation(function (this: typeof doc) {
          return Promise.resolve(this);
        }),
      });
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });
      mockMembershipModel.findOne.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue(mockMemDoc({ organizationId: "org-2", membershipStatus: "invited" })),
      });

      const result = await service.activateInvitedUser("user-123", {
        organizationId: "org-2",
        trustedAuthenticatedUserId: "user-123",
      });

      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(result.organizationId).toBe("org-2");
    });

    it("should throw when no pending membership invitation", async () => {
      const doc = mockDoc({ passwordHash: undefined });
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });
      mockMembershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.activateInvitedUser("user-123", {
          password: "validpass1",
          organizationId: "org-1",
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("deactivateOrganizationMembership", () => {
    it("should disable an active membership and revoke all sessions", async () => {
      const doc = mockDoc({
        save: jest.fn().mockImplementation(function (this: typeof doc) {
          return Promise.resolve(this);
        }),
      });
      const membership = mockMemDoc({ membershipStatus: "active", role: "member" });
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });
      mockUserModel.updateOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({}),
      });
      mockMembershipModel.findOne
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(membership) })
        .mockReturnValueOnce({
          sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue({ ...membership, membershipStatus: "disabled" }),
        });

      const result = await service.deactivateOrganizationMembership("user-123", "org-1");

      expect(membership.membershipStatus).toBe("disabled");
      expect(membership.save).toHaveBeenCalled();
      expect(mockSessionsService.revokeSession).toHaveBeenCalledWith("user-123");
      expect(result.organizationMembershipStatus).toBe("disabled");
    });

    it("should reject deactivating the last active admin", async () => {
      const doc = mockDoc();
      const membership = mockMemDoc({ membershipStatus: "active", role: "admin" });
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });
      mockMembershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(membership),
      });
      mockMembershipModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      await expect(service.deactivateOrganizationMembership("user-123", "org-1")).rejects.toThrow(
        BadRequestException,
      );
      expect(membership.save).not.toHaveBeenCalled();
    });
  });

  describe("reactivateOrganizationMembership", () => {
    it("should reactivate a disabled membership", async () => {
      const doc = mockDoc();
      const membership = mockMemDoc({ membershipStatus: "disabled", role: "member" });
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });
      mockMembershipModel.findOne
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(membership) })
        .mockReturnValueOnce({
          exec: jest.fn().mockResolvedValue({ ...membership, membershipStatus: "active" }),
        });

      const result = await service.reactivateOrganizationMembership("user-123", "org-1");

      expect(membership.membershipStatus).toBe("active");
      expect(membership.save).toHaveBeenCalled();
      expect(result.organizationMembershipStatus).toBe("active");
    });
  });

  describe("updateInvitedUserEmail", () => {
    it("should update email when membership is still invited", async () => {
      const doc = mockDoc({
        email: "old@example.com",
        save: jest.fn().mockImplementation(function (this: { email: string }) {
          return Promise.resolve(this);
        }),
      });
      mockUserModel.findOne
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(doc) })
        .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) });
      mockMembershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMemDoc({ membershipStatus: "invited" })),
      });

      const result = await service.updateInvitedUserEmail("user-123", "org-1", "new@example.com");

      expect(doc.email).toBe("new@example.com");
      expect(doc.save).toHaveBeenCalled();
      expect(result.email).toBe("new@example.com");
    });

    it("should throw when no pending invitation membership", async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDoc()),
      });
      mockMembershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.updateInvitedUserEmail("user-123", "org-1", "new@example.com"),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("cancelOrganizationInvitation", () => {
    it("should soft-delete membership and user when no other memberships remain", async () => {
      const doc = mockDoc({
        save: jest.fn().mockImplementation(function (this: unknown) {
          return Promise.resolve(this);
        }),
      }) as ReturnType<typeof mockDoc> & { deletedAt?: Date };
      const membership = mockMemDoc({ membershipStatus: "invited" });
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });
      mockMembershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(membership),
      });
      mockMembershipModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      await service.cancelOrganizationInvitation("user-123", "org-1");

      expect(membership.deletedAt).toBeInstanceOf(Date);
      expect(membership.save).toHaveBeenCalled();
      expect(doc.deletedAt).toBeInstanceOf(Date);
      expect(doc.save).toHaveBeenCalled();
    });

    it("should throw when no pending invitation membership", async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDoc()),
      });
      mockMembershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.cancelOrganizationInvitation("user-123", "org-1")).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("findById", () => {
    it("should return user when found", async () => {
      const doc = mockDoc();
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.findById("user-123");

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        _id: "user-123",
        ...activeDocumentFilter,
      });
      expect(result).toMatchObject({
        id: "user-123",
        email: "user@example.com",
        status: "active",
        role: "member",
      });
    });

    it("should return membership for the requested organization (multi-org)", async () => {
      const doc = mockDoc({ organizationId: "org-2" });
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });
      mockMembershipModel.findOne.mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue(
            mockMemDoc({ organizationId: "org-1", membershipStatus: "active", role: "member" }),
          ),
      });

      const result = await service.findById("user-123", "org-1");

      expect(mockMembershipModel.findOne).toHaveBeenCalledWith({
        userId: "user-123",
        organizationId: "org-1",
        deletedAt: null,
      });
      expect(result).toMatchObject({
        id: "user-123",
        organizationId: "org-1",
        organizationMembershipStatus: "active",
      });
    });

    it("should return null when user not found", async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findById("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("listByOrganization", () => {
    it("should return users with roles from memberships", async () => {
      const mRows = [
        { userId: "user-123", organizationId: "org-1", role: "admin", membershipStatus: "active" },
      ];
      mockMembershipModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mRows),
        }),
      });
      const udoc = mockDoc({ _id: { toString: () => "user-123" } });
      mockUserModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([udoc]),
      });

      const result = await service.listByOrganization("org-1");

      expect(mockMembershipModel.find).toHaveBeenCalledWith({
        organizationId: "org-1",
        deletedAt: null,
      });
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe("admin");
      expect(result[0].organizationMembershipStatus).toBe("active");
      expect(result[0].organizationId).toBe("org-1");
    });

    it("should expose the listed membership organizationId, not the user primary org", async () => {
      const mRows = [
        {
          userId: "user-123",
          organizationId: "org-listed",
          role: "member",
          membershipStatus: "active",
        },
      ];
      mockMembershipModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mRows),
        }),
      });
      const udoc = mockDoc({
        _id: { toString: () => "user-123" },
        organizationId: "org-primary",
      });
      mockUserModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([udoc]),
      });

      const result = await service.listByOrganization("org-listed");

      expect(result).toHaveLength(1);
      expect(result[0].organizationId).toBe("org-listed");
      expect(result[0].id).toBe("user-123");
    });
  });

  describe("validateCredentials", () => {
    it("should return response when credentials are valid", async () => {
      const doc = mockDoc({ passwordHash: "hashed" });
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateCredentials("user@example.com", "password");

      expect(bcrypt.compare).toHaveBeenCalledWith("password", "hashed");
      expect(result).toMatchObject({
        id: "user-123",
        organizationId: "org-1",
        email: "user@example.com",
        role: "member",
        status: "active",
        emailVerified: true,
      });
    });

    it("should return emailVerified false without updating lastLogin", async () => {
      const doc = mockDoc({ passwordHash: "hashed", emailVerified: false });
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateCredentials("user@example.com", "password");

      expect(result).toEqual({
        id: "user-123",
        email: "user@example.com",
        name: "Test User",
        status: "active",
        emailVerified: false,
      });
      expect(doc.save).not.toHaveBeenCalled();
    });

    it("should return null when user not found", async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.validateCredentials("unknown@example.com", "password");

      expect(result).toBeNull();
    });

    it("should return null when password does not match", async () => {
      const doc = mockDoc({ passwordHash: "hashed" });
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateCredentials("user@example.com", "wrongpassword");

      expect(result).toBeNull();
    });

    it("should return null when membership for active org is still invited", async () => {
      const doc = mockDoc({ passwordHash: "hashed" });
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockMembershipModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockMemDoc({ membershipStatus: "invited" })]),
      });

      const result = await service.validateCredentials("user@example.com", "password");

      expect(result).toBeNull();
    });

    it("should return null when no membership exists for active org", async () => {
      const doc = mockDoc({ passwordHash: "hashed" });
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockMembershipModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await service.validateCredentials("user@example.com", "password");

      expect(result).toBeNull();
    });

    it("should reject login when all organization memberships are disabled", async () => {
      const doc = mockDoc({ passwordHash: "hashed" });
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockMembershipModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockMemDoc({ membershipStatus: "disabled" })]),
      });

      await expect(service.validateCredentials("user@example.com", "password")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("should return account without organization when user has no org yet", async () => {
      const doc = mockDoc({ passwordHash: "hashed", organizationId: undefined });
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateCredentials("solo@example.com", "password");

      expect(result).toEqual({
        id: "user-123",
        email: "user@example.com",
        name: "Test User",
        status: "active",
        emailVerified: true,
      });
    });
  });

  describe("updateName", () => {
    it("should update user name", async () => {
      const doc = mockDoc({ name: "New Name" });
      mockUserModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.updateName("user-123", { name: "New Name" });

      expect(mockUserModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: "user-123", ...activeDocumentFilter },
        { $set: { name: "New Name" } },
        { new: true },
      );
      expect(result.name).toBe("New Name");
    });

    it("should throw BadRequestException when name is empty", async () => {
      await expect(service.updateName("user-123", { name: "   " })).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw NotFoundException when user does not exist", async () => {
      mockUserModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.updateName("user-123", { name: "X" })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("changePassword", () => {
    it("should change password when current password is correct", async () => {
      const doc = mockDoc({
        passwordHash: "hashed",
        save: jest.fn().mockResolvedValue(undefined),
      });
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.changePassword("user-123", {
        currentPassword: "old",
        newPassword: "new-pass1",
      });

      expect(bcrypt.compare).toHaveBeenCalledWith("old", "hashed");
      expect(bcrypt.hash).toHaveBeenCalledWith("new-pass1", 12);
      expect(doc.save).toHaveBeenCalled();
    });

    it("should throw UnauthorizedException when current password is wrong", async () => {
      const doc = mockDoc({ passwordHash: "hashed" });
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.changePassword("user-123", {
          currentPassword: "wrong",
          newPassword: "new-pass1",
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw NotFoundException when user does not exist", async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.changePassword("non-existent", {
          currentPassword: "old",
          newPassword: "new-pass1",
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findFoundingAdminUserId", () => {
    it("should return the earliest admin membership user id", async () => {
      mockMembershipModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockMemDoc({ userId: "admin-1", role: "admin" })),
        }),
      });

      const result = await service.findFoundingAdminUserId("org-1");

      expect(mockMembershipModel.findOne).toHaveBeenCalledWith({
        organizationId: "org-1",
        role: "admin",
        deletedAt: null,
        membershipStatus: { $in: ["active", "invited"] },
      });
      expect(result).toBe("admin-1");
    });

    it("should return null when organizationId is empty", async () => {
      await expect(service.findFoundingAdminUserId("  ")).resolves.toBeNull();
      expect(mockMembershipModel.findOne).not.toHaveBeenCalled();
    });
  });

  describe("listPlatformDirectory", () => {
    it("enriches users with lastSeenAt", async () => {
      const doc = mockDoc({ lastLoginAt: new Date("2026-08-10T10:00:00.000Z") });
      mockUserModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });
      mockUserModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue([doc]),
            }),
          }),
        }),
      });
      mockSessionsService.getLatestLastSeenByUserIds.mockResolvedValue({
        "user-123": "2026-08-15T11:55:00.000Z",
      });

      const result = await service.listPlatformDirectory({ limit: 50, offset: 0 });

      expect(result.total).toBe(1);
      expect(result.users[0]?.lastSeenAt).toBe("2026-08-15T11:55:00.000Z");
      expect(mockSessionsService.getLatestLastSeenByUserIds).toHaveBeenCalledWith(["user-123"]);
    });

    it("filters activeOnly via sessions", async () => {
      mockSessionsService.listUserIdsActiveSince.mockResolvedValue({
        userIds: ["user-123"],
        total: 1,
      });
      const doc = mockDoc();
      mockUserModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([doc]),
      });
      mockSessionsService.getLatestLastSeenByUserIds.mockResolvedValue({
        "user-123": "2026-08-15T11:55:00.000Z",
      });

      const result = await service.listPlatformDirectory({
        activeOnly: true,
        limit: 20,
        offset: 0,
      });

      expect(mockSessionsService.listUserIdsActiveSince).toHaveBeenCalled();
      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});

describe("UserSessionsService", () => {
  let service: UserSessionsService;
  let mockUserModel: {
    findOne: jest.Mock;
    updateOne: jest.Mock;
  };
  let mockSessionModel: {
    create: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    deleteOne: jest.Mock;
    deleteMany: jest.Mock;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockUserModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(mockDoc()) }),
      updateOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue({}) }),
    };

    mockSessionModel = {
      create: jest.fn().mockResolvedValue({}),
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([]),
          }),
          exec: jest.fn().mockResolvedValue([]),
        }),
      }),
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      deleteOne: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue({ deletedCount: 1 }) }),
      deleteMany: jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue({ deletedCount: 1 }) }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: AbstractUserSessionsService, useClass: UserSessionsService },
        { provide: getModelToken("User"), useValue: mockUserModel },
        { provide: getModelToken("UserSession"), useValue: mockSessionModel },
      ],
    }).compile();

    service = module.get<UserSessionsService>(AbstractUserSessionsService);
  });

  it("should create a session document with derived label and device class", async () => {
    mockUserModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockDoc()),
    });
    mockSessionModel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
    });

    const result = await service.createSession("user-123", {
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    expect(result.sessionId).toBeTruthy();
    expect(mockSessionModel.deleteMany).toHaveBeenCalledWith({
      userId: "user-123",
      deviceClass: "desktop",
    });
    expect(mockSessionModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
        sessionId: result.sessionId,
        label: "Chrome · macOS",
        deviceClass: "desktop",
      }),
    );
    expect(mockUserModel.updateOne).toHaveBeenCalledWith(
      { _id: "user-123" },
      expect.objectContaining({
        $set: expect.objectContaining({ lastLoginAt: expect.any(Date) }),
        $unset: { activeSessionId: "" },
      }),
    );
  });

  it("should replace the previous session of the same device class", async () => {
    mockUserModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockDoc()),
    });
    mockSessionModel.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
    });

    await service.createSession("user-123", {
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    });

    expect(mockSessionModel.deleteMany).toHaveBeenCalledWith({
      userId: "user-123",
      deviceClass: "mobile",
    });
    expect(mockSessionModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ deviceClass: "mobile", label: "Safari · iOS" }),
    );
  });

  it("should validate an existing session and touch lastSeenAt when stale", async () => {
    const createdAt = new Date("2026-01-15T10:00:00.000Z");
    const session = {
      createdAt,
      lastSeenAt: new Date(Date.now() - 10 * 60 * 1000),
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockSessionModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(session),
    });

    await expect(service.validateSession("user-123", "session-1")).resolves.toEqual({
      valid: true,
    });
    expect(session.save).toHaveBeenCalled();
    expect(mockUserModel.updateOne).toHaveBeenCalledWith(
      { _id: "user-123", lastLoginAt: null },
      { $set: { lastLoginAt: createdAt } },
    );

    mockSessionModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    await expect(service.validateSession("user-123", "missing")).resolves.toEqual({
      valid: false,
    });
  });

  it("should revoke one session or all sessions", async () => {
    mockUserModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockDoc()),
    });

    await service.revokeSession("user-123", "session-1");
    expect(mockSessionModel.deleteOne).toHaveBeenCalledWith({
      userId: "user-123",
      sessionId: "session-1",
    });

    await service.revokeSession("user-123");
    expect(mockSessionModel.deleteMany).toHaveBeenCalledWith({ userId: "user-123" });
  });

  it("should revoke other sessions while keeping the current one", async () => {
    mockUserModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockDoc()),
    });

    await service.revokeOtherSessions("user-123", "keep-me");

    expect(mockSessionModel.deleteMany).toHaveBeenCalledWith({
      userId: "user-123",
      sessionId: { $ne: "keep-me" },
    });
  });

  it("should list sessions with current flag and device class", async () => {
    mockUserModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockDoc()),
    });
    const now = new Date("2026-07-18T12:00:00.000Z");
    mockSessionModel.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          {
            _id: { toString: () => "doc-1" },
            sessionId: "sid-current",
            label: "Chrome · macOS",
            deviceClass: "desktop",
            userAgent: "Chrome",
            createdAt: now,
            lastSeenAt: now,
          },
          {
            _id: { toString: () => "doc-2" },
            sessionId: "sid-other",
            label: "Safari · iOS",
            deviceClass: "mobile",
            createdAt: now,
            lastSeenAt: now,
          },
        ]),
      }),
    });

    const result = await service.listSessions("user-123", "sid-current");

    expect(result).toEqual([
      expect.objectContaining({
        sessionId: "sid-current",
        current: true,
        deviceClass: "desktop",
      }),
      expect.objectContaining({
        sessionId: "sid-other",
        current: false,
        deviceClass: "mobile",
      }),
    ]);
  });
});

describe("UserPreferencesService", () => {
  let service: UserPreferencesService;
  let mockUserModel: { findOne: jest.Mock };
  let mockPreferencesModel: { findOne: jest.Mock; findOneAndUpdate: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockUserModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(mockDoc()) }),
    };

    mockPreferencesModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: AbstractUserPreferencesService, useClass: UserPreferencesService },
        { provide: getModelToken("User"), useValue: mockUserModel },
        { provide: getModelToken("UserPreferences"), useValue: mockPreferencesModel },
      ],
    }).compile();

    service = module.get<UserPreferencesService>(AbstractUserPreferencesService);
  });

  describe("getPreferences", () => {
    it("should return default preferences when none exist", async () => {
      mockPreferencesModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.getPreferences("user-123", "org-1");

      expect(result).toEqual({
        userId: "user-123",
        preferences: {
          theme: "light",
          sidebarCollapsed: "expanded",
          voiceFieldEnabled: false,
          quickActions: defaultQuickActions,
          onboardingCompletedOrganizationIds: [],
          onboardingProfileCompleted: false,
          setupGuideDismissedOrganizationIds: [],
          setupGuideDismissed: false,
        },
      });
    });

    it("should return stored preferences scoped to the organization", async () => {
      mockPreferencesModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          userId: "user-123",
          theme: "dark",
          sidebarCollapsed: "collapsed",
          voiceFieldEnabled: false,
          quickActions: bookmarksFrom(["my_day", "calendar"]),
          quickActionsByOrganizationId: {
            "org-1": bookmarksFrom(["my_day", "calendar"]),
          },
          onboardingCompletedOrganizationIds: ["org-1"],
          setupGuideDismissedOrganizationIds: ["org-1"],
        }),
      });

      const forOrg1 = await service.getPreferences("user-123", "org-1");
      const forOrg2 = await service.getPreferences("user-123", "org-2");

      expect(forOrg1.preferences).toEqual({
        theme: "dark",
        sidebarCollapsed: "collapsed",
        voiceFieldEnabled: false,
        quickActions: bookmarksFrom(["my_day", "calendar"]),
        onboardingCompletedOrganizationIds: ["org-1"],
        onboardingProfileCompleted: true,
        setupGuideDismissedOrganizationIds: ["org-1"],
        setupGuideDismissed: true,
      });
      expect(forOrg2.preferences.onboardingProfileCompleted).toBe(false);
      expect(forOrg2.preferences.setupGuideDismissed).toBe(false);
      expect(forOrg2.preferences.quickActions).toEqual(bookmarksFrom(["my_day", "calendar"]));
    });

    it("should not leak entity bookmarks from legacy prefs to another organization", async () => {
      const caseHref = "/cases/507f1f77bcf86cd799439011";
      mockPreferencesModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          userId: "user-123",
          theme: "light",
          sidebarCollapsed: "expanded",
          voiceFieldEnabled: false,
          quickActions: [
            { id: "qa_case", href: caseHref, label: "Dossier org1" },
            ...bookmarksFrom(["cases_list"]),
          ],
          quickActionsByOrganizationId: {
            "org-1": [
              { id: "qa_case", href: caseHref, label: "Dossier org1" },
              ...bookmarksFrom(["cases_list"]),
            ],
          },
          onboardingCompletedOrganizationIds: [],
          setupGuideDismissedOrganizationIds: [],
        }),
      });

      const forOrg1 = await service.getPreferences("user-123", "org-1");
      const forOrg2 = await service.getPreferences("user-123", "org-2");

      expect(forOrg1.preferences.quickActions.map((b) => b.href)).toContain(caseHref);
      expect(forOrg2.preferences.quickActions.map((b) => b.href)).not.toContain(caseHref);
      expect(forOrg2.preferences.quickActions.map((b) => b.href)).toContain("/cases");
    });

    it("should migrate legacy quickActionIds when quickActions is absent", async () => {
      mockPreferencesModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          userId: "user-123",
          theme: "light",
          sidebarCollapsed: "expanded",
          voiceFieldEnabled: false,
          quickActionIds: ["case_new", "calendar"],
          onboardingCompletedOrganizationIds: [],
        }),
      });

      const result = await service.getPreferences("user-123");

      expect(result.preferences.quickActions).toEqual(bookmarksFrom(["case_new", "calendar"]));
    });

    it("should fall back to default quickActions when stored list is invalid", async () => {
      mockPreferencesModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          userId: "user-123",
          theme: "light",
          sidebarCollapsed: "expanded",
          voiceFieldEnabled: false,
          quickActionIds: ["not_a_real_id"],
          onboardingCompletedOrganizationIds: [],
        }),
      });

      const result = await service.getPreferences("user-123");

      expect(result.preferences.quickActions).toEqual(defaultQuickActions);
    });
  });

  describe("updatePreferences", () => {
    it("should upsert preferences and return them", async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDoc()),
      });
      mockPreferencesModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          userId: "user-123",
          theme: "dark",
          sidebarCollapsed: "expanded",
          voiceFieldEnabled: false,
          quickActions: defaultQuickActions,
          onboardingCompletedOrganizationIds: [],
        }),
      });

      const result = await service.updatePreferences("user-123", {
        theme: "dark",
        organizationId: "org-1",
      });

      expect(result).toEqual({
        userId: "user-123",
        preferences: {
          theme: "dark",
          sidebarCollapsed: "expanded",
          voiceFieldEnabled: false,
          quickActions: defaultQuickActions,
          onboardingCompletedOrganizationIds: [],
          onboardingProfileCompleted: false,
          setupGuideDismissedOrganizationIds: [],
          setupGuideDismissed: false,
        },
      });
    });

    it("should mark onboarding complete for a specific organization", async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDoc()),
      });
      mockPreferencesModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          userId: "user-123",
          theme: "light",
          sidebarCollapsed: "expanded",
          voiceFieldEnabled: false,
          quickActions: defaultQuickActions,
          onboardingCompletedOrganizationIds: ["org-2"],
          setupGuideDismissedOrganizationIds: [],
        }),
      });

      const result = await service.updatePreferences("user-123", {
        onboardingProfileCompleted: true,
        organizationId: "org-2",
      });

      expect(mockPreferencesModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: "user-123" },
        expect.objectContaining({
          $addToSet: { onboardingCompletedOrganizationIds: "org-2" },
        }),
        expect.any(Object),
      );
      expect(
        mockPreferencesModel.findOneAndUpdate.mock.calls[0][1].$setOnInsert,
      ).not.toHaveProperty("onboardingCompletedOrganizationIds");
      expect(result.preferences.onboardingCompletedOrganizationIds).toEqual(["org-2"]);
      expect(result.preferences.onboardingProfileCompleted).toBe(true);
    });

    it("should dismiss setup guide for a specific organization", async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDoc()),
      });
      mockPreferencesModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          userId: "user-123",
          theme: "light",
          sidebarCollapsed: "expanded",
          voiceFieldEnabled: false,
          quickActions: defaultQuickActions,
          onboardingCompletedOrganizationIds: ["org-1"],
          setupGuideDismissedOrganizationIds: ["org-1"],
        }),
      });

      const result = await service.updatePreferences("user-123", {
        setupGuideDismissed: true,
        organizationId: "org-1",
      });

      expect(mockPreferencesModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: "user-123" },
        expect.objectContaining({
          $addToSet: { setupGuideDismissedOrganizationIds: "org-1" },
        }),
        expect.any(Object),
      );
      expect(result.preferences.setupGuideDismissed).toBe(true);
    });

    it("should require organizationId when updating onboardingProfileCompleted", async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDoc()),
      });

      await expect(
        service.updatePreferences("user-123", { onboardingProfileCompleted: true }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should update quickActions", async () => {
      const next = bookmarksFrom(["my_day", "customers", "stock"]);
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDoc()),
      });
      mockPreferencesModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          userId: "user-123",
          theme: "light",
          sidebarCollapsed: "expanded",
          voiceFieldEnabled: false,
          quickActions: defaultQuickActions,
          quickActionsByOrganizationId: { "org-1": next },
          onboardingCompletedOrganizationIds: ["org-1"],
          setupGuideDismissedOrganizationIds: [],
        }),
      });

      const result = await service.updatePreferences("user-123", {
        quickActions: next,
        organizationId: "org-1",
      });

      expect(mockPreferencesModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: "user-123" },
        expect.objectContaining({
          $set: expect.objectContaining({
            "quickActionsByOrganizationId.org-1": next,
          }),
        }),
        expect.any(Object),
      );
      expect(result.preferences.quickActions).toEqual(next);
      expect(result.preferences.onboardingProfileCompleted).toBe(true);
    });

    it("should reject quickActions without organizationId", async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDoc()),
      });

      await expect(
        service.updatePreferences("user-123", {
          quickActions: bookmarksFrom(["my_day"]),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should reject invalid quickActions", async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDoc()),
      });

      await expect(
        service.updatePreferences("user-123", {
          quickActions: "not-an-array" as never,
          organizationId: "org-1",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException when user does not exist", async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.updatePreferences("non-existent", { theme: "dark" })).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

describe("ProspectOutreachService", () => {
  let service: ProspectOutreachService;
  let mockProspectOutreachModel: {
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
    find: jest.Mock;
    countDocuments: jest.Mock;
    create: jest.Mock;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockProspectOutreachModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
      findOneAndUpdate: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: { toString: () => "out-1" },
          siren: "123456789",
          companyName: "Demo SARL",
          email: "demo@example.fr",
          sentByUserId: "staff-1",
          sentByEmail: "staff@planwise.fr",
          subject: "Sujet",
          status: "sent",
          sentAt: new Date("2026-08-01T10:00:00.000Z"),
        }),
      }),
      find: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
      countDocuments: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      }),
      create: jest.fn().mockResolvedValue({
        _id: { toString: () => "out-note" },
        siren: "123456789",
        companyName: "Demo SARL",
        email: "",
        sentByUserId: "staff-1",
        sentByEmail: "staff@planwise.fr",
        subject: "Note prospection",
        status: "noted",
        sentAt: new Date("2026-08-01T10:00:00.000Z"),
        comment: "Pas de site",
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: AbstractProspectOutreachService, useClass: ProspectOutreachService },
        { provide: getModelToken("ProspectOutreach"), useValue: mockProspectOutreachModel },
      ],
    }).compile();

    service = module.get<ProspectOutreachService>(AbstractProspectOutreachService);
  });

  it("should upsert a prospect outreach by siren", async () => {
    const result = await service.createProspectOutreach({
      siren: "123 456 789",
      companyName: "Demo SARL",
      email: "Demo@Example.fr",
      sentByUserId: "staff-1",
      sentByEmail: "staff@planwise.fr",
      subject: "Sujet",
    });

    expect(mockProspectOutreachModel.findOneAndUpdate).toHaveBeenCalledWith(
      { siren: "123456789" },
      expect.objectContaining({
        $set: expect.objectContaining({
          siren: "123456789",
          email: "demo@example.fr",
          status: "sent",
        }),
      }),
      { upsert: true, new: true },
    );
    expect(result.siren).toBe("123456789");
    expect(result.email).toBe("demo@example.fr");
  });

  it("should upsert email_not_found without requiring an email", async () => {
    mockProspectOutreachModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    mockProspectOutreachModel.findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        _id: { toString: () => "out-2" },
        siren: "123456789",
        companyName: "Demo SARL",
        email: "",
        sentByUserId: "staff-1",
        sentByEmail: "staff@planwise.fr",
        subject: "Email non trouvé",
        status: "email_not_found",
        sentAt: new Date("2026-08-01T10:00:00.000Z"),
      }),
    });

    const result = await service.createProspectOutreach({
      siren: "123456789",
      companyName: "Demo SARL",
      email: "",
      sentByUserId: "staff-1",
      sentByEmail: "staff@planwise.fr",
      subject: "Email non trouvé",
      status: "email_not_found",
    });

    expect(result.status).toBe("email_not_found");
    expect(mockProspectOutreachModel.findOneAndUpdate).toHaveBeenCalledWith(
      { siren: "123456789" },
      expect.objectContaining({
        $set: expect.objectContaining({ status: "email_not_found", email: "" }),
      }),
      { upsert: true, new: true },
    );
  });

  it("should reject email_not_found when already sent", async () => {
    mockProspectOutreachModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({ status: "sent" }),
    });

    await expect(
      service.createProspectOutreach({
        siren: "123456789",
        companyName: "X",
        email: "",
        sentByUserId: "staff-1",
        sentByEmail: "staff@planwise.fr",
        subject: "Email non trouvé",
        status: "email_not_found",
      }),
    ).rejects.toThrow(ConflictException);
  });

  it("should create a noted outreach with comment", async () => {
    mockProspectOutreachModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    const result = await service.upsertProspectComment({
      siren: "123456789",
      companyName: "Demo SARL",
      comment: "  Pas de site  ",
      sentByUserId: "staff-1",
      sentByEmail: "staff@planwise.fr",
    });

    expect(mockProspectOutreachModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        siren: "123456789",
        status: "noted",
        comment: "Pas de site",
      }),
    );
    expect(result.comment).toBe("Pas de site");
  });

  it("should update comment on existing outreach without changing status", async () => {
    const existing = {
      _id: { toString: () => "out-1" },
      siren: "123456789",
      companyName: "Demo SARL",
      email: "a@b.fr",
      sentByUserId: "staff-1",
      sentByEmail: "staff@planwise.fr",
      subject: "Sujet",
      status: "sent" as const,
      sentAt: new Date("2026-08-01T10:00:00.000Z"),
      comment: "old",
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockProspectOutreachModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(existing),
    });

    const result = await service.upsertProspectComment({
      siren: "123456789",
      companyName: "Demo SARL",
      comment: "nouveau commentaire",
      sentByUserId: "staff-2",
      sentByEmail: "other@planwise.fr",
    });

    expect(existing.save).toHaveBeenCalled();
    expect(existing.comment).toBe("nouveau commentaire");
    expect(existing.status).toBe("sent");
    expect(result.status).toBe("sent");
    expect(result.comment).toBe("nouveau commentaire");
  });

  it("should list outreaches by sirens", async () => {
    mockProspectOutreachModel.find.mockReturnValue({
      exec: jest.fn().mockResolvedValue([
        {
          _id: { toString: () => "out-1" },
          siren: "123456789",
          companyName: "Demo",
          email: "a@b.fr",
          sentByUserId: "staff-1",
          sentByEmail: "staff@planwise.fr",
          subject: "Sujet",
          status: "sent",
          sentAt: new Date("2026-08-01T10:00:00.000Z"),
        },
      ]),
    });

    const result = await service.listProspectOutreachesBySirens(["123456789", "bad"]);

    expect(mockProspectOutreachModel.find).toHaveBeenCalledWith({
      siren: { $in: ["123456789"] },
    });
    expect(result.outreaches).toHaveLength(1);
    expect(result.outreaches[0]?.siren).toBe("123456789");
  });

  it("should list all outreaches paginated by sentAt desc", async () => {
    mockProspectOutreachModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(2),
    });
    mockProspectOutreachModel.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        {
          _id: { toString: () => "o2" },
          siren: "987654321",
          companyName: "B",
          email: "",
          sentByUserId: "u1",
          sentByEmail: "staff@planwise.fr",
          subject: "Email non trouvé",
          status: "email_not_found",
          sentAt: new Date("2026-08-02T10:00:00.000Z"),
        },
        {
          _id: { toString: () => "o1" },
          siren: "123456789",
          companyName: "A",
          email: "a@b.fr",
          sentByUserId: "u1",
          sentByEmail: "staff@planwise.fr",
          subject: "Hello",
          status: "sent",
          sentAt: new Date("2026-08-01T10:00:00.000Z"),
        },
      ]),
    });

    const result = await service.listProspectOutreaches({ limit: 50, offset: 0 });

    expect(result.total).toBe(2);
    expect(result.outreaches).toHaveLength(2);
    expect(result.outreaches[0]?.status).toBe("email_not_found");
    expect(mockProspectOutreachModel.find).toHaveBeenCalledWith({});
  });

  it("should filter outreaches by status and search", async () => {
    mockProspectOutreachModel.countDocuments.mockReturnValue({
      exec: jest.fn().mockResolvedValue(1),
    });
    mockProspectOutreachModel.find.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([
        {
          _id: { toString: () => "o1" },
          siren: "123456789",
          companyName: "Plomberie Dupont",
          email: "contact@dupont.fr",
          sentByUserId: "u1",
          sentByEmail: "staff@planwise.fr",
          subject: "Ajout manuel",
          status: "noted",
          sentAt: new Date("2026-08-01T10:00:00.000Z"),
        },
      ]),
    });

    await service.listProspectOutreaches({
      limit: 50,
      offset: 0,
      status: "noted",
      search: "Dupont",
    });

    expect(mockProspectOutreachModel.find).toHaveBeenCalledWith({
      status: "noted",
      $or: expect.arrayContaining([
        { companyName: { $regex: "Dupont", $options: "i" } },
        { siren: { $regex: "Dupont", $options: "i" } },
      ]),
    });
    expect(mockProspectOutreachModel.countDocuments).toHaveBeenCalledWith({
      status: "noted",
      $or: expect.any(Array),
    });
  });
});
