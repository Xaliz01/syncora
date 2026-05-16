import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException, UnauthorizedException } from "@nestjs/common";
import { UsersController } from "../users.controller";
import { AbstractUsersService } from "../../../domain/ports/users.service.port";

describe("UsersController", () => {
  let controller: UsersController;
  let mockUsersService: jest.Mocked<AbstractUsersService>;

  beforeEach(async () => {
    mockUsersService = {
      create: jest.fn(),
      invite: jest.fn(),
      activateInvitedUser: jest.fn(),
      patch: jest.fn(),
      findById: jest.fn(),
      listByOrganization: jest.fn(),
      listOrganizationMemberships: jest.fn(),
      addOrganizationMembership: jest.fn(),
      validateCredentials: jest.fn(),
      updateName: jest.fn(),
      changePassword: jest.fn(),
      getPreferences: jest.fn(),
      updatePreferences: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: AbstractUsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("create", () => {
    it("should call service.create and return the result", async () => {
      const body = {
        organizationId: "org-1",
        email: "user@example.com",
        password: "secret",
        name: "User",
        role: "member" as const,
      };
      const expected = {
        id: "user-123",
        organizationId: "org-1",
        email: "user@example.com",
        name: "User",
        role: "member" as const,
        status: "active" as const,
        createdAt: "2025-01-01T00:00:00.000Z",
      };
      mockUsersService.create.mockResolvedValue(expected);

      const result = await controller.create(body);

      expect(mockUsersService.create).toHaveBeenCalledWith(body);
      expect(result).toEqual(expected);
    });
  });

  describe("invite", () => {
    it("should call service.invite and return the result", async () => {
      const body = {
        organizationId: "org-1",
        email: "invited@example.com",
        name: "Invited",
        invitedByUserId: "admin-1",
      };
      const expected = {
        id: "user-456",
        organizationId: "org-1",
        email: "invited@example.com",
        name: "Invited",
        role: "member" as const,
        status: "active" as const,
        createdAt: "2025-01-01T00:00:00.000Z",
      };
      mockUsersService.invite.mockResolvedValue(expected);

      const result = await controller.invite(body);

      expect(mockUsersService.invite).toHaveBeenCalledWith(body);
      expect(result).toEqual(expected);
    });
  });

  describe("activateInvitedUser", () => {
    it("should call service.activateInvitedUser and return the result", async () => {
      const body = { password: "newpassword", name: "Activated User" };
      const expected = {
        id: "user-123",
        organizationId: "org-1",
        email: "user@example.com",
        name: "Activated User",
        role: "member" as const,
        status: "active" as const,
        createdAt: "2025-01-01T00:00:00.000Z",
      };
      mockUsersService.activateInvitedUser.mockResolvedValue(expected);

      const result = await controller.activateInvitedUser("user-123", body);

      expect(mockUsersService.activateInvitedUser).toHaveBeenCalledWith("user-123", body);
      expect(result).toEqual(expected);
    });
  });

  describe("findById", () => {
    it("should return user when found", async () => {
      const user = {
        id: "user-123",
        organizationId: "org-1",
        email: "user@example.com",
        name: "User",
        role: "member" as const,
        status: "active" as const,
        createdAt: "2025-01-01T00:00:00.000Z",
      };
      mockUsersService.findById.mockResolvedValue(user);

      const result = await controller.findById("user-123");

      expect(mockUsersService.findById).toHaveBeenCalledWith("user-123");
      expect(result).toEqual(user);
    });

    it("should throw NotFoundException when user is null", async () => {
      mockUsersService.findById.mockResolvedValue(null);

      await expect(controller.findById("non-existent")).rejects.toThrow(NotFoundException);
      await expect(controller.findById("non-existent")).rejects.toThrow("User not found");
    });
  });

  describe("listByOrganization", () => {
    it("should return users when organizationId is provided", async () => {
      const users = [
        {
          id: "user-1",
          organizationId: "org-1",
          email: "u1@example.com",
          role: "member" as const,
          status: "active" as const,
          createdAt: "2025-01-01T00:00:00.000Z",
        },
      ];
      mockUsersService.listByOrganization.mockResolvedValue(users);

      const result = await controller.listByOrganization("org-1");

      expect(mockUsersService.listByOrganization).toHaveBeenCalledWith("org-1");
      expect(result).toEqual(users);
    });

    it("should throw BadRequestException when organizationId is missing", async () => {
      await expect(controller.listByOrganization("")).rejects.toThrow(BadRequestException);
      await expect(controller.listByOrganization("")).rejects.toThrow(
        "organizationId query param is required",
      );
    });
  });

  describe("updateName", () => {
    it("should call service.updateName and return the result", async () => {
      const body = { name: "New Name" };
      const expected = {
        id: "user-123",
        organizationId: "org-1",
        email: "user@example.com",
        name: "New Name",
        role: "member" as const,
        status: "active" as const,
        createdAt: "2025-01-01T00:00:00.000Z",
      };
      mockUsersService.updateName.mockResolvedValue(expected);

      const result = await controller.updateName("user-123", body);

      expect(mockUsersService.updateName).toHaveBeenCalledWith("user-123", body);
      expect(result).toEqual(expected);
    });
  });

  describe("changePassword", () => {
    it("should call service.changePassword", async () => {
      mockUsersService.changePassword.mockResolvedValue(undefined);

      await controller.changePassword("user-123", {
        currentPassword: "old",
        newPassword: "new",
      });

      expect(mockUsersService.changePassword).toHaveBeenCalledWith("user-123", {
        currentPassword: "old",
        newPassword: "new",
      });
    });
  });

  describe("getPreferences", () => {
    it("should call service.getPreferences and return the result", async () => {
      const expected = {
        userId: "user-123",
        preferences: { theme: "light" as const, sidebarCollapsed: "expanded" as const },
      };
      mockUsersService.getPreferences.mockResolvedValue(expected);

      const result = await controller.getPreferences("user-123");

      expect(mockUsersService.getPreferences).toHaveBeenCalledWith("user-123");
      expect(result).toEqual(expected);
    });
  });

  describe("updatePreferences", () => {
    it("should call service.updatePreferences and return the result", async () => {
      const body = { theme: "dark" as const };
      const expected = {
        userId: "user-123",
        preferences: { theme: "dark" as const, sidebarCollapsed: "expanded" as const },
      };
      mockUsersService.updatePreferences.mockResolvedValue(expected);

      const result = await controller.updatePreferences("user-123", body);

      expect(mockUsersService.updatePreferences).toHaveBeenCalledWith("user-123", body);
      expect(result).toEqual(expected);
    });
  });

  describe("validateCredentials", () => {
    it("should return credentials response when valid", async () => {
      const response = {
        id: "user-123",
        organizationId: "org-1",
        email: "user@example.com",
        name: "User",
        role: "member" as const,
        status: "active" as const,
      };
      mockUsersService.validateCredentials.mockResolvedValue(response);

      const result = await controller.validateCredentials({
        email: "user@example.com",
        password: "secret",
      });

      expect(mockUsersService.validateCredentials).toHaveBeenCalledWith(
        "user@example.com",
        "secret",
      );
      expect(result).toEqual(response);
    });

    it("should throw UnauthorizedException when credentials are invalid", async () => {
      mockUsersService.validateCredentials.mockResolvedValue(null);

      await expect(
        controller.validateCredentials({ email: "user@example.com", password: "wrong" }),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        controller.validateCredentials({ email: "user@example.com", password: "wrong" }),
      ).rejects.toThrow("Invalid email or password");
    });
  });
});
