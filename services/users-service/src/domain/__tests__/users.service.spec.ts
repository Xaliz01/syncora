import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { ConflictException, NotFoundException, BadRequestException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { activeDocumentFilter } from "@syncora/shared";
import { UsersService } from "../users.service";
import { AbstractUsersService } from "../ports/users.service.port";

jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashed"),
  compare: jest.fn()
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

  const mockDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: { toString: () => "user-123" },
    organizationId: "org-1",
    email: "user@example.com",
    passwordHash: "hashed",
    name: "Test User",
    role: "member",
    status: "active",
    get: jest.fn((key: string) => (key === "createdAt" ? new Date("2025-01-01") : undefined)),
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides
  });

  const mockMemDoc = (overrides: Record<string, unknown> = {}) => ({
    _id: { toString: () => "mem-1" },
    userId: "user-123",
    organizationId: "org-1",
    role: "member",
    membershipStatus: "active",
    get: jest.fn((key: string) => {
      if (key === "createdAt") return new Date("2025-01-01");
      if (key === "updatedAt") return new Date("2025-01-01");
      return undefined;
    }),
    ...overrides
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
        updateOne: jest.fn().mockResolvedValue(undefined)
      }
    };

    mockMembershipModel = {
      findOneAndUpdate: jest.fn().mockResolvedValue(mockMemDoc()),
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([])
        })
      }),
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMemDoc({ role: "member" }))
      }),
      countDocuments: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(1)
      }),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 })
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: AbstractUsersService, useClass: UsersService },
        { provide: getModelToken("User"), useValue: mockUserModel },
        { provide: getModelToken("OrganizationMembership"), useValue: mockMembershipModel }
      ]
    }).compile();

    service = module.get<UsersService>(AbstractUsersService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a user with hashed password and membership", async () => {
      mockUserModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      const doc = mockDoc({ email: "new@example.com", name: "New User" });
      mockUserModel.create.mockResolvedValue(doc);

      const body = {
        organizationId: "org-1",
        email: "new@example.com",
        password: "secret123",
        name: "New User",
        role: "member" as const
      };
      const result = await service.create(body);

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        email: "new@example.com",
        ...activeDocumentFilter
      });
      expect(bcrypt.hash).toHaveBeenCalledWith("secret123", 10);
      expect(mockUserModel.create).toHaveBeenCalledWith({
        organizationId: "org-1",
        email: "new@example.com",
        passwordHash: "hashed",
        name: "New User",
        role: "member",
        status: "active"
      });
      expect(mockMembershipModel.findOneAndUpdate).toHaveBeenCalled();
      expect(result).toMatchObject({
        id: "user-123",
        organizationId: "org-1",
        email: "new@example.com",
        name: "New User",
        role: "member",
        status: "active"
      });
    });

    it("should throw ConflictException when email already exists", async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDoc())
      });

      await expect(
        service.create({
          organizationId: "org-1",
          email: "existing@example.com",
          password: "secret",
          role: "member"
        })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("patch", () => {
    it("should update organizationId", async () => {
      const execMock = jest.fn().mockResolvedValue(mockDoc({ organizationId: "org-new" }));
      mockUserModel.findOneAndUpdate.mockReturnValue({ exec: execMock });

      const result = await service.patch("user-123", { organizationId: "org-new" });

      expect(mockUserModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: "user-123", ...activeDocumentFilter },
        { $set: { organizationId: "org-new" } },
        { new: true }
      );
      expect(result.organizationId).toBe("org-new");
    });

    it("should update organizationId and role together", async () => {
      const execMock = jest.fn().mockResolvedValue(mockDoc({ organizationId: "org-new", role: "admin" }));
      mockUserModel.findOneAndUpdate.mockReturnValue({ exec: execMock });

      await service.patch("user-123", { organizationId: "org-new", role: "admin" });

      expect(mockUserModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: "user-123", ...activeDocumentFilter },
        { $set: { organizationId: "org-new", role: "admin" } },
        { new: true }
      );
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(service.patch("user-123", {})).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException when user does not exist", async () => {
      const execMock = jest.fn().mockResolvedValue(null);
      mockUserModel.findOneAndUpdate.mockReturnValue({ exec: execMock });

      await expect(service.patch("user-123", { organizationId: "org-x" })).rejects.toThrow(NotFoundException);
    });
  });

  describe("invite", () => {
    it("should create user active without password and membership invited", async () => {
      mockUserModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      const doc = mockDoc({
        status: "active",
        passwordHash: undefined,
        email: "invited@example.com",
        name: "Invited User"
      });
      mockUserModel.create.mockResolvedValue(doc);

      const body = {
        organizationId: "org-1",
        email: "invited@example.com",
        name: "Invited User",
        role: "member" as const,
        invitedByUserId: "admin-1"
      };
      const result = await service.invite(body);

      expect(mockMembershipModel.findOneAndUpdate).toHaveBeenCalled();
      expect(result.status).toBe("active");
    });
  });

  describe("activateInvitedUser", () => {
    it("should set password and activate membership when pending invite exists", async () => {
      const doc = mockDoc({
        passwordHash: undefined,
        save: jest.fn().mockImplementation(function (this: typeof doc) {
          return Promise.resolve(this);
        })
      });
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc)
      });
      mockMembershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMemDoc({ membershipStatus: "invited" }))
      });

      const result = await service.activateInvitedUser("user-123", {
        password: "new-password",
        name: "Activated"
      });

      expect(bcrypt.hash).toHaveBeenCalledWith("new-password", expect.any(Number));
      expect(doc.save).toHaveBeenCalled();
      expect(mockMembershipModel.updateMany).toHaveBeenCalled();
      expect(result.status).toBe("active");
    });

    it("should throw when no pending membership invitation", async () => {
      const doc = mockDoc({ passwordHash: undefined });
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc)
      });
      mockMembershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      await expect(
        service.activateInvitedUser("user-123", { password: "x" })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("findById", () => {
    it("should return user when found", async () => {
      const doc = mockDoc();
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc)
      });

      const result = await service.findById("user-123");

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        _id: "user-123",
        ...activeDocumentFilter
      });
      expect(result).toMatchObject({
        id: "user-123",
        email: "user@example.com",
        status: "active"
      });
    });

    it("should return null when user not found", async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      const result = await service.findById("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("listByOrganization", () => {
    it("should return users with roles from memberships", async () => {
      const mRows = [
        { userId: "user-123", organizationId: "org-1", role: "admin", membershipStatus: "active" }
      ];
      mockMembershipModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mRows)
        })
      });
      const udoc = mockDoc({ role: "member", _id: { toString: () => "user-123" } });
      mockUserModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([udoc])
      });

      const result = await service.listByOrganization("org-1");

      expect(mockMembershipModel.find).toHaveBeenCalledWith({ organizationId: "org-1", deletedAt: null });
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe("admin");
      expect(result[0].organizationMembershipStatus).toBe("active");
    });
  });

  describe("validateCredentials", () => {
    it("should return response when credentials are valid", async () => {
      const doc = mockDoc({ passwordHash: "hashed" });
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc)
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateCredentials("user@example.com", "password");

      expect(bcrypt.compare).toHaveBeenCalledWith("password", "hashed");
      expect(result).toMatchObject({
        id: "user-123",
        organizationId: "org-1",
        email: "user@example.com",
        role: "member",
        status: "active"
      });
    });

    it("should return null when user not found", async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      const result = await service.validateCredentials("unknown@example.com", "password");

      expect(result).toBeNull();
    });

    it("should return null when password does not match", async () => {
      const doc = mockDoc({ passwordHash: "hashed" });
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc)
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateCredentials("user@example.com", "wrongpassword");

      expect(result).toBeNull();
    });

    it("should return null when membership for active org is still invited", async () => {
      const doc = mockDoc({ passwordHash: "hashed" });
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc)
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockMembershipModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockMemDoc({ membershipStatus: "invited" }))
      });

      const result = await service.validateCredentials("user@example.com", "password");

      expect(result).toBeNull();
    });
  });
});
