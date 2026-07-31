import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { activeDocumentFilter } from "@planwise/shared";
import { UsersService } from "../users.service";
import { AbstractUsersService } from "../ports/users.service.port";

jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashed"),
  compare: jest.fn(),
}));

describe("UsersService", () => {
  let service: UsersService;
  let mockUserModel: {
    create: jest.Mock;
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
    find: jest.Mock;
    collection: { findOne: jest.Mock; updateOne: jest.Mock };
  };
  let mockMembershipModel: {
    findOneAndUpdate: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    countDocuments: jest.Mock;
    updateMany: jest.Mock;
  };
  let mockPreferencesModel: {
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
  };

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
      }),
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMemDoc({ role: "member" })),
      }),
      countDocuments: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      }),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };

    mockPreferencesModel = {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: AbstractUsersService, useClass: UsersService },
        { provide: getModelToken("User"), useValue: mockUserModel },
        { provide: getModelToken("OrganizationMembership"), useValue: mockMembershipModel },
        { provide: getModelToken("UserPreferences"), useValue: mockPreferencesModel },
        {
          provide: getModelToken("SupportImpersonationAudit"),
          useValue: { create: jest.fn().mockResolvedValue({ _id: { toString: () => "audit-1" } }) },
        },
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

  describe("createSession / validateSession / revokeSession", () => {
    it("should create a new active session id", async () => {
      const doc = mockDoc({
        activeSessionId: "old-session",
        save: jest.fn().mockImplementation(function (this: unknown) {
          return Promise.resolve(this);
        }),
      }) as ReturnType<typeof mockDoc> & { activeSessionId?: string };
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      const result = await service.createSession("user-123");

      expect(result.sessionId).toBeTruthy();
      expect(result.sessionId).not.toBe("old-session");
      expect(doc.activeSessionId).toBe(result.sessionId);
      expect(doc.save).toHaveBeenCalled();
    });

    it("should validate only the active session id", async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDoc({ activeSessionId: "session-1" })),
      });

      await expect(service.validateSession("user-123", "session-1")).resolves.toEqual({
        valid: true,
      });
      await expect(service.validateSession("user-123", "other")).resolves.toEqual({
        valid: false,
      });
    });

    it("should revoke matching session", async () => {
      const doc = mockDoc({
        activeSessionId: "session-1",
        save: jest.fn().mockImplementation(function (this: unknown) {
          return Promise.resolve(this);
        }),
      }) as ReturnType<typeof mockDoc> & { activeSessionId?: string };
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      await service.revokeSession("user-123", "session-1");

      expect(doc.activeSessionId).toBeUndefined();
      expect(doc.save).toHaveBeenCalled();
    });

    it("should not clear session when revoke sid does not match", async () => {
      const doc = mockDoc({
        activeSessionId: "session-1",
        save: jest.fn().mockImplementation(function (this: unknown) {
          return Promise.resolve(this);
        }),
      }) as ReturnType<typeof mockDoc> & { activeSessionId?: string };
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      await service.revokeSession("user-123", "other-session");

      expect(doc.activeSessionId).toBe("session-1");
      expect(doc.save).not.toHaveBeenCalled();
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
      mockMembershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMemDoc({ membershipStatus: "invited" })),
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
      mockMembershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.validateCredentials("user@example.com", "password");

      expect(result).toBeNull();
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

  describe("getPreferences", () => {
    it("should return default preferences when none exist", async () => {
      mockPreferencesModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.getPreferences("user-123");

      expect(result).toEqual({
        userId: "user-123",
        preferences: {
          theme: "light",
          sidebarCollapsed: "expanded",
          quickActionIds: ["case_new", "cases_list", "calendar", "case_templates"],
        },
      });
    });

    it("should return stored preferences when they exist", async () => {
      mockPreferencesModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          userId: "user-123",
          theme: "dark",
          sidebarCollapsed: "collapsed",
          quickActionIds: ["my_day", "calendar"],
        }),
      });

      const result = await service.getPreferences("user-123");

      expect(result).toEqual({
        userId: "user-123",
        preferences: {
          theme: "dark",
          sidebarCollapsed: "collapsed",
          quickActionIds: ["my_day", "calendar"],
        },
      });
    });

    it("should fall back to default quickActionIds when stored list is invalid", async () => {
      mockPreferencesModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          userId: "user-123",
          theme: "light",
          sidebarCollapsed: "expanded",
          quickActionIds: ["case_new"],
        }),
      });

      const result = await service.getPreferences("user-123");

      expect(result.preferences.quickActionIds).toEqual([
        "case_new",
        "cases_list",
        "calendar",
        "case_templates",
      ]);
    });
  });

  describe("updatePreferences", () => {
    it("should upsert preferences and return them", async () => {
      const doc = mockDoc();
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });
      mockPreferencesModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          userId: "user-123",
          theme: "dark",
          sidebarCollapsed: "expanded",
          quickActionIds: ["case_new", "cases_list", "calendar", "case_templates"],
        }),
      });

      const result = await service.updatePreferences("user-123", { theme: "dark" });

      expect(result).toEqual({
        userId: "user-123",
        preferences: {
          theme: "dark",
          sidebarCollapsed: "expanded",
          quickActionIds: ["case_new", "cases_list", "calendar", "case_templates"],
        },
      });
    });

    it("should update quickActionIds", async () => {
      const doc = mockDoc();
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });
      mockPreferencesModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          userId: "user-123",
          theme: "light",
          sidebarCollapsed: "expanded",
          quickActionIds: ["my_day", "customers", "stock"],
        }),
      });

      const result = await service.updatePreferences("user-123", {
        quickActionIds: ["my_day", "customers", "stock"],
      });

      expect(mockPreferencesModel.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: "user-123" },
        expect.objectContaining({
          $set: expect.objectContaining({
            quickActionIds: ["my_day", "customers", "stock"],
          }),
        }),
        expect.any(Object),
      );
      expect(result.preferences.quickActionIds).toEqual(["my_day", "customers", "stock"]);
    });

    it("should reject invalid quickActionIds", async () => {
      const doc = mockDoc();
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc),
      });

      await expect(
        service.updatePreferences("user-123", { quickActionIds: ["case_new"] }),
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
