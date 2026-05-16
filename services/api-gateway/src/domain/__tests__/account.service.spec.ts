import { Test, TestingModule } from "@nestjs/testing";
import { HttpService } from "@nestjs/axios";
import { of, throwError } from "rxjs";
import type { AxiosResponse } from "axios";
import type { AuthUser, UserPreferencesResponse, UserResponse } from "@syncora/shared";
import { AccountService } from "../account.service";
import { AbstractAccountService } from "../ports/account.service.port";
import { BadRequestException, NotFoundException } from "@nestjs/common";

describe("AccountService", () => {
  let service: AccountService;
  let mockHttpService: { request: jest.Mock };

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
    mockHttpService = {
      request: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: AbstractAccountService, useClass: AccountService },
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();

    service = module.get<AccountService>(AbstractAccountService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("updateName", () => {
    it("should call users-service PUT /users/:id/name", async () => {
      const expected: UserResponse = {
        id: "user-123",
        organizationId: "org-1",
        email: "user@example.com",
        name: "New Name",
        role: "member",
        status: "active",
      };
      mockHttpService.request.mockReturnValue(of({ data: expected, status: 200 } as AxiosResponse));

      const result = await service.updateName(mockUser, { name: "New Name" });

      expect(mockHttpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "put",
          url: expect.stringContaining("/users/user-123/name"),
          data: { name: "New Name" },
        }),
      );
      expect(result).toEqual(expected);
    });
  });

  describe("changePassword", () => {
    it("should call users-service POST /users/:id/change-password", async () => {
      mockHttpService.request.mockReturnValue(of({ data: null, status: 204 } as AxiosResponse));

      await service.changePassword(mockUser, {
        currentPassword: "old",
        newPassword: "new",
      });

      expect(mockHttpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "post",
          url: expect.stringContaining("/users/user-123/change-password"),
          data: { currentPassword: "old", newPassword: "new" },
        }),
      );
    });

    it("should rethrow 400 as BadRequestException", async () => {
      mockHttpService.request.mockReturnValue(
        throwError(() => ({
          response: { status: 400, data: { message: "Bad request" } },
        })),
      );

      await expect(
        service.changePassword(mockUser, { currentPassword: "x", newPassword: "y" }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getPreferences", () => {
    it("should call users-service GET /users/:id/preferences", async () => {
      const expected: UserPreferencesResponse = {
        userId: "user-123",
        preferences: { theme: "light", sidebarCollapsed: "expanded" },
      };
      mockHttpService.request.mockReturnValue(of({ data: expected, status: 200 } as AxiosResponse));

      const result = await service.getPreferences(mockUser);

      expect(mockHttpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "get",
          url: expect.stringContaining("/users/user-123/preferences"),
        }),
      );
      expect(result).toEqual(expected);
    });
  });

  describe("updatePreferences", () => {
    it("should call users-service PUT /users/:id/preferences", async () => {
      const expected: UserPreferencesResponse = {
        userId: "user-123",
        preferences: { theme: "dark", sidebarCollapsed: "collapsed" },
      };
      mockHttpService.request.mockReturnValue(of({ data: expected, status: 200 } as AxiosResponse));

      const result = await service.updatePreferences(mockUser, {
        theme: "dark",
        sidebarCollapsed: "collapsed",
      });

      expect(result).toEqual(expected);
    });

    it("should rethrow 404 as NotFoundException", async () => {
      mockHttpService.request.mockReturnValue(
        throwError(() => ({
          response: { status: 404, data: { message: "User not found" } },
        })),
      );

      await expect(service.updatePreferences(mockUser, { theme: "dark" })).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
