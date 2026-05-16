import { Test, TestingModule } from "@nestjs/testing";
import type { AuthUser, UserPreferencesResponse, UserResponse } from "@syncora/shared";
import { AccountController } from "../account.controller";
import { AbstractAccountService } from "../../../domain/ports/account.service.port";
import { JwtAuthGuard } from "../../../infrastructure/jwt-auth.guard";

describe("AccountController", () => {
  let controller: AccountController;
  let mockAccountService: jest.Mocked<AbstractAccountService>;

  const mockUser: AuthUser = {
    id: "user-123",
    email: "user@example.com",
    organizationId: "org-1",
    role: "member",
    status: "active",
    permissions: [],
    name: "Test User",
  };

  beforeEach(async () => {
    mockAccountService = {
      updateName: jest.fn(),
      changePassword: jest.fn(),
      getPreferences: jest.fn(),
      updatePreferences: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountController],
      providers: [
        {
          provide: AbstractAccountService,
          useValue: mockAccountService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AccountController>(AccountController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("updateName", () => {
    it("should call accountService.updateName and return result", async () => {
      const body = { name: "New Name" };
      const expected: UserResponse = {
        id: "user-123",
        organizationId: "org-1",
        email: "user@example.com",
        name: "New Name",
        role: "member",
        status: "active",
      };
      mockAccountService.updateName.mockResolvedValue(expected);

      const result = await controller.updateName(mockUser, body);

      expect(mockAccountService.updateName).toHaveBeenCalledWith(mockUser, body);
      expect(result).toEqual(expected);
    });
  });

  describe("changePassword", () => {
    it("should call accountService.changePassword", async () => {
      mockAccountService.changePassword.mockResolvedValue(undefined);

      await controller.changePassword(mockUser, {
        currentPassword: "old",
        newPassword: "new",
      });

      expect(mockAccountService.changePassword).toHaveBeenCalledWith(mockUser, {
        currentPassword: "old",
        newPassword: "new",
      });
    });
  });

  describe("getPreferences", () => {
    it("should call accountService.getPreferences and return result", async () => {
      const expected: UserPreferencesResponse = {
        userId: "user-123",
        preferences: { theme: "light", sidebarCollapsed: "expanded" },
      };
      mockAccountService.getPreferences.mockResolvedValue(expected);

      const result = await controller.getPreferences(mockUser);

      expect(mockAccountService.getPreferences).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(expected);
    });
  });

  describe("updatePreferences", () => {
    it("should call accountService.updatePreferences and return result", async () => {
      const body = { theme: "dark" as const };
      const expected: UserPreferencesResponse = {
        userId: "user-123",
        preferences: { theme: "dark", sidebarCollapsed: "expanded" },
      };
      mockAccountService.updatePreferences.mockResolvedValue(expected);

      const result = await controller.updatePreferences(mockUser, body);

      expect(mockAccountService.updatePreferences).toHaveBeenCalledWith(mockUser, body);
      expect(result).toEqual(expected);
    });
  });
});
