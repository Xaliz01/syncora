import { Test, TestingModule } from "@nestjs/testing";
import { HttpService } from "@nestjs/axios";
import { of, throwError } from "rxjs";
import type { AxiosResponse } from "axios";
import type { AuthUser, UserPreferencesResponse, UserResponse } from "@planwise/shared";
import { AccountService } from "../account.service";
import { AbstractAccountService } from "../ports/account.service.port";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";

describe("AccountService", () => {
  let service: AccountService;
  let mockHttpService: { request: jest.Mock; get: jest.Mock; post: jest.Mock; put: jest.Mock };

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
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
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
        preferences: {
          theme: "light",
          sidebarCollapsed: "expanded",
          quickActionIds: ["case_new", "cases_list", "calendar", "case_templates"],
          onboardingCompletedOrganizationIds: [],
          onboardingProfileCompleted: false,
          setupGuideDismissedOrganizationIds: [],
          setupGuideDismissed: false,
        },
      };
      mockHttpService.request.mockReturnValue(of({ data: expected, status: 200 } as AxiosResponse));

      const result = await service.getPreferences(mockUser);

      expect(mockHttpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "get",
          url: expect.stringContaining("/users/user-123/preferences?organizationId=org-1"),
        }),
      );
      expect(result).toEqual(expected);
    });
  });

  describe("updatePreferences", () => {
    it("should call users-service PUT /users/:id/preferences", async () => {
      const expected: UserPreferencesResponse = {
        userId: "user-123",
        preferences: {
          theme: "dark",
          sidebarCollapsed: "collapsed",
          quickActionIds: ["case_new", "cases_list", "calendar", "case_templates"],
          onboardingCompletedOrganizationIds: [],
          onboardingProfileCompleted: false,
          setupGuideDismissedOrganizationIds: [],
          setupGuideDismissed: false,
        },
      };
      mockHttpService.request.mockReturnValue(of({ data: expected, status: 200 } as AxiosResponse));

      const result = await service.updatePreferences(mockUser, {
        theme: "dark",
        sidebarCollapsed: "collapsed",
      });

      expect(mockHttpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "put",
          data: expect.objectContaining({
            theme: "dark",
            sidebarCollapsed: "collapsed",
            organizationId: "org-1",
          }),
        }),
      );
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

  describe("completeOnboardingProfile", () => {
    const foundingAdmin: AuthUser = {
      ...mockUser,
      role: "admin",
      isFoundingAdmin: true,
    };

    it("should create and link a technician when going on interventions", async () => {
      mockHttpService.get.mockReturnValueOnce(
        of({ data: { userId: "user-123" }, status: 200 } as AxiosResponse),
      );
      mockHttpService.get.mockReturnValueOnce(of({ data: null, status: 200 } as AxiosResponse));
      mockHttpService.post.mockReturnValue(
        of({ data: { id: "tech-1" }, status: 201 } as AxiosResponse),
      );
      mockHttpService.put.mockReturnValue(
        of({ data: { id: "tech-1", userId: "user-123" }, status: 200 } as AxiosResponse),
      );
      const prefs: UserPreferencesResponse = {
        userId: "user-123",
        preferences: {
          theme: "light",
          sidebarCollapsed: "expanded",
          quickActionIds: ["case_new", "cases_list", "calendar", "case_templates"],
          onboardingCompletedOrganizationIds: ["org-1"],
          onboardingProfileCompleted: true,
          setupGuideDismissedOrganizationIds: [],
          setupGuideDismissed: false,
        },
      };
      mockHttpService.request.mockReturnValue(of({ data: prefs, status: 200 } as AxiosResponse));

      const result = await service.completeOnboardingProfile(foundingAdmin, {
        goesOnInterventions: true,
      });

      expect(mockHttpService.post).toHaveBeenCalledWith(
        expect.stringContaining("/technicians"),
        expect.objectContaining({
          organizationId: "org-1",
          email: "user@example.com",
          status: "actif",
        }),
      );
      expect(mockHttpService.put).toHaveBeenCalledWith(
        expect.stringContaining("/technicians/tech-1/link-user"),
        { userId: "user-123" },
        expect.objectContaining({ params: { organizationId: "org-1" } }),
      );
      expect(mockHttpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "put",
          data: expect.objectContaining({
            onboardingProfileCompleted: true,
            organizationId: "org-1",
          }),
        }),
      );
      expect(result.technicianId).toBe("tech-1");
      expect(result.preferences.onboardingProfileCompleted).toBe(true);
    });

    it("should only mark onboarding complete when office-only", async () => {
      mockHttpService.get.mockReturnValueOnce(
        of({ data: { userId: "user-123" }, status: 200 } as AxiosResponse),
      );
      mockHttpService.get.mockReturnValueOnce(of({ data: null, status: 200 } as AxiosResponse));
      const prefs: UserPreferencesResponse = {
        userId: "user-123",
        preferences: {
          theme: "light",
          sidebarCollapsed: "expanded",
          quickActionIds: ["case_new", "cases_list", "calendar", "case_templates"],
          onboardingCompletedOrganizationIds: ["org-1"],
          onboardingProfileCompleted: true,
          setupGuideDismissedOrganizationIds: [],
          setupGuideDismissed: false,
        },
      };
      mockHttpService.request.mockReturnValue(of({ data: prefs, status: 200 } as AxiosResponse));

      const result = await service.completeOnboardingProfile(foundingAdmin, {
        goesOnInterventions: false,
      });

      expect(mockHttpService.post).not.toHaveBeenCalled();
      expect(result.technicianId).toBeUndefined();
      expect(result.preferences.onboardingProfileCompleted).toBe(true);
    });

    it("should reject non-founding admins", async () => {
      mockHttpService.get.mockReturnValue(
        of({ data: { userId: "other-admin" }, status: 200 } as AxiosResponse),
      );

      await expect(
        service.completeOnboardingProfile(foundingAdmin, { goesOnInterventions: false }),
      ).rejects.toThrow(ForbiddenException);
      expect(mockHttpService.post).not.toHaveBeenCalled();
    });
  });

  describe("getCrispIdentity", () => {
    const originalSecret = process.env.CRISP_IDENTITY_SECRET;

    afterEach(() => {
      if (originalSecret === undefined) {
        delete process.env.CRISP_IDENTITY_SECRET;
      } else {
        process.env.CRISP_IDENTITY_SECRET = originalSecret;
      }
    });

    it("should return email and nickname without signature when secret is unset", async () => {
      delete process.env.CRISP_IDENTITY_SECRET;

      const result = await service.getCrispIdentity(mockUser);

      expect(result).toEqual({
        email: "user@example.com",
        nickname: "Test User",
      });
    });

    it("should return HMAC signature when CRISP_IDENTITY_SECRET is set", async () => {
      process.env.CRISP_IDENTITY_SECRET = "test-crisp-secret";

      const result = await service.getCrispIdentity(mockUser);

      expect(result.email).toBe("user@example.com");
      expect(result.nickname).toBe("Test User");
      expect(result.signature).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should fall back to email as nickname when name is missing", async () => {
      const result = await service.getCrispIdentity({
        ...mockUser,
        name: undefined,
      });

      expect(result.nickname).toBe("user@example.com");
    });
  });

  describe("listSessions", () => {
    it("should call users-service GET /users/:id/sessions with currentSessionId", async () => {
      const expected = {
        sessions: [
          {
            id: "1",
            sessionId: "sid-1",
            label: "Chrome · macOS",
            deviceClass: "desktop",
            createdAt: "2026-07-18T12:00:00.000Z",
            lastSeenAt: "2026-07-18T12:00:00.000Z",
            current: true,
          },
        ],
      };
      mockHttpService.request.mockReturnValue(of({ data: expected, status: 200 } as AxiosResponse));

      const result = await service.listSessions("user-123", "sid-1");

      expect(mockHttpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "get",
          url: expect.stringContaining("/users/user-123/sessions?currentSessionId=sid-1"),
        }),
      );
      expect(result).toEqual(expected);
    });
  });

  describe("revokeSession", () => {
    it("should call users-service DELETE /users/:id/sessions/:sessionId", async () => {
      mockHttpService.request.mockReturnValue(of({ data: null, status: 204 } as AxiosResponse));

      await service.revokeSession("user-123", "sid-2");

      expect(mockHttpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "delete",
          url: expect.stringContaining("/users/user-123/sessions/sid-2"),
        }),
      );
    });
  });

  describe("revokeOtherSessions", () => {
    it("should call users-service POST revoke-others", async () => {
      mockHttpService.request.mockReturnValue(of({ data: null, status: 204 } as AxiosResponse));

      await service.revokeOtherSessions("user-123", "sid-1");

      expect(mockHttpService.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "post",
          url: expect.stringContaining("/users/user-123/sessions/revoke-others"),
          data: { keepSessionId: "sid-1" },
        }),
      );
    });
  });
});
