import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { ConflictException, NotFoundException, BadRequestException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
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
    findById: jest.Mock;
    find: jest.Mock;
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

  beforeEach(async () => {
    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockResolvedValue("hashed");
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const execMock = jest.fn();
    const sortMock = jest.fn().mockReturnValue({ exec: execMock });
    mockUserModel = {
      create: jest.fn(),
      findOne: jest.fn().mockReturnValue({ exec: execMock }),
      findById: jest.fn().mockReturnValue({ exec: execMock }),
      find: jest.fn().mockReturnValue({ sort: sortMock })
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: AbstractUsersService, useClass: UsersService },
        {
          provide: getModelToken("User"),
          useValue: mockUserModel
        }
      ]
    }).compile();

    service = module.get<UsersService>(AbstractUsersService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a user with hashed password", async () => {
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

      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: "new@example.com" });
      expect(bcrypt.hash).toHaveBeenCalledWith("secret123", 10);
      expect(mockUserModel.create).toHaveBeenCalledWith({
        organizationId: "org-1",
        email: "new@example.com",
        passwordHash: "hashed",
        name: "New User",
        role: "member",
        status: "active"
      });
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
      await expect(
        service.create({
          organizationId: "org-1",
          email: "existing@example.com",
          password: "secret",
          role: "member"
        })
      ).rejects.toThrow("User with this email already exists");
    });
  });

  describe("invite", () => {
    it("should create invited user with status invited", async () => {
      mockUserModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      const doc = mockDoc({ status: "invited" });
      mockUserModel.create.mockResolvedValue(doc);

      const body = {
        organizationId: "org-1",
        email: "invited@example.com",
        name: "Invited User",
        role: "member" as const,
        invitedByUserId: "admin-1"
      };
      const result = await service.invite(body);

      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: "invited@example.com" });
      expect(mockUserModel.create).toHaveBeenCalledWith({
        organizationId: "org-1",
        email: "invited@example.com",
        name: "Invited User",
        role: "member",
        status: "invited",
        invitedByUserId: "admin-1"
      });
      expect(result.status).toBe("invited");
    });

    it("should use default role member when not provided", async () => {
      mockUserModel.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
      const doc = mockDoc({ status: "invited", role: "member" });
      mockUserModel.create.mockResolvedValue(doc);

      await service.invite({
        organizationId: "org-1",
        email: "invited@example.com",
        invitedByUserId: "admin-1"
      });

      expect(mockUserModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: "member" })
      );
    });

    it("should throw ConflictException when email already exists", async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDoc())
      });

      await expect(
        service.invite({
          organizationId: "org-1",
          email: "existing@example.com",
          invitedByUserId: "admin-1"
        })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("activateInvitedUser", () => {
    it("should activate invited user with hashed password", async () => {
      const doc = mockDoc({ status: "invited" });
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc)
      });

      const result = await service.activateInvitedUser("user-123", {
        password: "newpassword",
        name: "Updated Name"
      });

      expect(bcrypt.hash).toHaveBeenCalledWith("newpassword", 10);
      expect(doc.passwordHash).toBe("hashed");
      expect(doc.status).toBe("active");
      expect(doc.name).toBe("Updated Name");
      expect(doc.save).toHaveBeenCalled();
      expect(result).toMatchObject({ id: "user-123", status: "active" });
    });

    it("should throw NotFoundException when user not found", async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      await expect(
        service.activateInvitedUser("non-existent", { password: "secret" })
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.activateInvitedUser("non-existent", { password: "secret" })
      ).rejects.toThrow("User not found");
    });

    it("should throw BadRequestException when user is not invited", async () => {
      const doc = mockDoc({ status: "active" });
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc)
      });

      await expect(
        service.activateInvitedUser("user-123", { password: "secret" })
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.activateInvitedUser("user-123", { password: "secret" })
      ).rejects.toThrow("User is not in invited status");
    });
  });

  describe("findById", () => {
    it("should return user when found", async () => {
      const doc = mockDoc();
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc)
      });

      const result = await service.findById("user-123");

      expect(mockUserModel.findById).toHaveBeenCalledWith("user-123");
      expect(result).toMatchObject({
        id: "user-123",
        email: "user@example.com",
        status: "active"
      });
    });

    it("should return null when user not found", async () => {
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      const result = await service.findById("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("listByOrganization", () => {
    it("should return users sorted by createdAt", async () => {
      const docs = [mockDoc({ _id: { toString: () => "u1" } }), mockDoc({ _id: { toString: () => "u2" } })];
      const sortMock = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(docs)
      });
      mockUserModel.find.mockReturnValue({ sort: sortMock });

      const result = await service.listByOrganization("org-1");

      expect(mockUserModel.find).toHaveBeenCalledWith({ organizationId: "org-1" });
      expect(sortMock).toHaveBeenCalledWith({ createdAt: 1 });
      expect(result).toHaveLength(2);
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

      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: "user@example.com" });
      expect(bcrypt.compare).toHaveBeenCalledWith("password", "hashed");
      expect(result).toEqual({
        id: "user-123",
        organizationId: "org-1",
        email: "user@example.com",
        name: "Test User",
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

    it("should return null when user status is not active", async () => {
      const doc = mockDoc({ status: "invited" });
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc)
      });

      const result = await service.validateCredentials("user@example.com", "password");

      expect(result).toBeNull();
    });

    it("should return null when password hash is missing", async () => {
      const doc = mockDoc({ passwordHash: undefined });
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(doc)
      });

      const result = await service.validateCredentials("user@example.com", "password");

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
  });
});
