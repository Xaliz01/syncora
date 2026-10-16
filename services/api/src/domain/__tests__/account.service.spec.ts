import { Test, TestingModule } from "@nestjs/testing";
import type { AuthUser, UserPreferencesResponse, UserResponse } from "@planwise/shared";
import { DEFAULT_QUICK_ACTIONS } from "@planwise/shared";
import { AccountService } from "../account.service";
import { AbstractAccountService } from "../ports/account.service.port";
import { AbstractUsersService } from "../users/ports/users.service.port";
import { AbstractUserPreferencesService } from "../users/ports/user-preferences.service.port";
import { AbstractUserSessionsService } from "../users/ports/user-sessions.service.port";
import { AbstractTechniciansService } from "../technicians/ports/technicians.service.port";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";

const defaultQuickActions = DEFAULT_QUICK_ACTIONS.map((b) => ({ ...b }));

describe("AccountService", () => {
  let service: AccountService;
  let users: {
    updateName: jest.Mock;
    changePassword: jest.Mock;
    findFoundingAdminUserId: jest.Mock;
  };
  let preferences: { getPreferences: jest.Mock; updatePreferences: jest.Mock };
  let sessions: {
    listSessions: jest.Mock;
    revokeSession: jest.Mock;
    revokeOtherSessions: jest.Mock;
  };
  let technicians: {
    findByUserId: jest.Mock;
    createTechnician: jest.Mock;
    linkUserToTechnician: jest.Mock;
  };

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
    users = {
      updateName: jest.fn(),
      changePassword: jest.fn().mockResolvedValue(undefined),
      findFoundingAdminUserId: jest.fn(),
    };
    preferences = {
      getPreferences: jest.fn(),
      updatePreferences: jest.fn(),
    };
    sessions = {
      listSessions: jest.fn(),
      revokeSession: jest.fn().mockResolvedValue(undefined),
      revokeOtherSessions: jest.fn().mockResolvedValue(undefined),
    };
    technicians = {
      findByUserId: jest.fn().mockResolvedValue(null),
      createTechnician: jest.fn(),
      linkUserToTechnician: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: AbstractAccountService, useClass: AccountService },
        { provide: AbstractUsersService, useValue: users },
        { provide: AbstractUserPreferencesService, useValue: preferences },
        { provide: AbstractUserSessionsService, useValue: sessions },
        { provide: AbstractTechniciansService, useValue: technicians },
      ],
    }).compile();

    service = module.get<AccountService>(AbstractAccountService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("updateName", () => {
    it("should update the user name in the users domain", async () => {
      const expected: UserResponse = {
        id: "user-123",
        organizationId: "org-1",
        email: "user@example.com",
        name: "New Name",
        role: "member",
        status: "active",
      };
      users.updateName.mockResolvedValue(expected);

      const result = await service.updateName(mockUser, { name: "New Name" });

      expect(users.updateName).toHaveBeenCalledWith("user-123", { name: "New Name" });
      expect(result).toEqual(expected);
    });
  });

  describe("changePassword", () => {
    it("should change the password in the users domain", async () => {
      await service.changePassword(mockUser, {
        currentPassword: "old",
        newPassword: "new",
      });

      expect(users.changePassword).toHaveBeenCalledWith("user-123", {
        currentPassword: "old",
        newPassword: "new",
      });
    });

    it("should rethrow 400 as BadRequestException", async () => {
      users.changePassword.mockRejectedValue(new BadRequestException("Bad request"));

      await expect(
        service.changePassword(mockUser, { currentPassword: "x", newPassword: "y" }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getPreferences", () => {
    it("should load preferences for the current organization", async () => {
      const expected: UserPreferencesResponse = {
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
      };
      preferences.getPreferences.mockResolvedValue(expected);

      const result = await service.getPreferences(mockUser);

      expect(preferences.getPreferences).toHaveBeenCalledWith("user-123", "org-1");
      expect(result).toEqual(expected);
    });
  });

  describe("updatePreferences", () => {
    it("should scope preference updates to the current organization", async () => {
      const expected: UserPreferencesResponse = {
        userId: "user-123",
        preferences: {
          theme: "dark",
          sidebarCollapsed: "collapsed",
          voiceFieldEnabled: false,
          quickActions: defaultQuickActions,
          onboardingCompletedOrganizationIds: [],
          onboardingProfileCompleted: false,
          setupGuideDismissedOrganizationIds: [],
          setupGuideDismissed: false,
        },
      };
      preferences.updatePreferences.mockResolvedValue(expected);

      const result = await service.updatePreferences(mockUser, {
        theme: "dark",
        sidebarCollapsed: "collapsed",
        voiceFieldEnabled: false,
      });

      expect(preferences.updatePreferences).toHaveBeenCalledWith(
        "user-123",
        expect.objectContaining({
          theme: "dark",
          sidebarCollapsed: "collapsed",
          voiceFieldEnabled: false,
          organizationId: "org-1",
        }),
      );
      expect(result).toEqual(expected);
    });

    it("should rethrow 404 as NotFoundException", async () => {
      preferences.updatePreferences.mockRejectedValue(new NotFoundException("User not found"));

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

    const prefs: UserPreferencesResponse = {
      userId: "user-123",
      preferences: {
        theme: "light",
        sidebarCollapsed: "expanded",
        voiceFieldEnabled: false,
        quickActions: defaultQuickActions,
        onboardingCompletedOrganizationIds: ["org-1"],
        onboardingProfileCompleted: true,
        setupGuideDismissedOrganizationIds: [],
        setupGuideDismissed: false,
      },
    };

    it("should create and link a technician when going on interventions", async () => {
      users.findFoundingAdminUserId.mockResolvedValue("user-123");
      technicians.findByUserId.mockResolvedValue(null);
      technicians.createTechnician.mockResolvedValue({ id: "tech-1" });
      preferences.updatePreferences.mockResolvedValue(prefs);

      const result = await service.completeOnboardingProfile(foundingAdmin, {
        goesOnInterventions: true,
      });

      expect(technicians.createTechnician).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-1",
          email: "user@example.com",
          status: "actif",
        }),
      );
      expect(technicians.linkUserToTechnician).toHaveBeenCalledWith("org-1", "tech-1", "user-123");
      expect(preferences.updatePreferences).toHaveBeenCalledWith(
        "user-123",
        expect.objectContaining({
          onboardingProfileCompleted: true,
          organizationId: "org-1",
        }),
      );
      expect(result.technicianId).toBe("tech-1");
      expect(result.preferences.onboardingProfileCompleted).toBe(true);
    });

    it("should only mark onboarding complete when office-only", async () => {
      users.findFoundingAdminUserId.mockResolvedValue("user-123");
      technicians.findByUserId.mockResolvedValue(null);
      preferences.updatePreferences.mockResolvedValue(prefs);

      const result = await service.completeOnboardingProfile(foundingAdmin, {
        goesOnInterventions: false,
      });

      expect(technicians.createTechnician).not.toHaveBeenCalled();
      expect(result.technicianId).toBeUndefined();
      expect(result.preferences.onboardingProfileCompleted).toBe(true);
    });

    it("should reject non-founding admins", async () => {
      users.findFoundingAdminUserId.mockResolvedValue("other-admin");

      await expect(
        service.completeOnboardingProfile(foundingAdmin, { goesOnInterventions: false }),
      ).rejects.toThrow(ForbiddenException);
      expect(technicians.createTechnician).not.toHaveBeenCalled();
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
    it("should list sessions and mark the current one", async () => {
      const listed = [
        {
          id: "1",
          sessionId: "sid-1",
          label: "Chrome · macOS",
          deviceClass: "desktop" as const,
          createdAt: "2026-07-18T12:00:00.000Z",
          lastSeenAt: "2026-07-18T12:00:00.000Z",
          current: true,
        },
      ];
      sessions.listSessions.mockResolvedValue(listed);

      const result = await service.listSessions("user-123", "sid-1");

      expect(sessions.listSessions).toHaveBeenCalledWith("user-123", "sid-1");
      expect(result).toEqual({ sessions: listed });
    });
  });

  describe("revokeSession", () => {
    it("should revoke the given session", async () => {
      await service.revokeSession("user-123", "sid-2");

      expect(sessions.revokeSession).toHaveBeenCalledWith("user-123", "sid-2");
    });
  });

  describe("revokeOtherSessions", () => {
    it("should revoke every session except the current one", async () => {
      await service.revokeOtherSessions("user-123", "sid-1");

      expect(sessions.revokeOtherSessions).toHaveBeenCalledWith("user-123", "sid-1");
    });
  });
});
