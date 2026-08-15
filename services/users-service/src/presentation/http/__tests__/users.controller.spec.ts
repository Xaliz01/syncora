import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, BadRequestException, UnauthorizedException } from "@nestjs/common";
import type { UserPreferencesResponse } from "@planwise/shared";
import { DEFAULT_QUICK_ACTIONS } from "@planwise/shared";
import { UsersController } from "../users.controller";
import { AbstractUsersService } from "../../../domain/ports/users.service.port";
import { AbstractUserSessionsService } from "../../../domain/ports/user-sessions.service.port";
import { AbstractUserPreferencesService } from "../../../domain/ports/user-preferences.service.port";
import { AbstractProspectOutreachService } from "../../../domain/ports/prospect-outreach.service.port";
import { AbstractImpersonationAuditService } from "../../../domain/ports/impersonation-audit.service.port";

const defaultQuickActions = DEFAULT_QUICK_ACTIONS.map((b) => ({ ...b }));

describe("UsersController", () => {
  let controller: UsersController;
  let mockUsersService: jest.Mocked<AbstractUsersService>;
  let mockSessionsService: jest.Mocked<AbstractUserSessionsService>;
  let mockPreferencesService: jest.Mocked<AbstractUserPreferencesService>;
  let mockProspectOutreachService: jest.Mocked<AbstractProspectOutreachService>;
  let mockImpersonationAuditService: jest.Mocked<AbstractImpersonationAuditService>;

  beforeEach(async () => {
    mockUsersService = {
      create: jest.fn(),
      createAccount: jest.fn(),
      verifyEmail: jest.fn(),
      resendEmailVerification: jest.fn(),
      findAccountById: jest.fn(),
      invite: jest.fn(),
      activateInvitedUser: jest.fn(),
      getInvitationActivationHints: jest.fn(),
      updateInvitedUserEmail: jest.fn(),
      cancelOrganizationInvitation: jest.fn(),
      deactivateOrganizationMembership: jest.fn(),
      reactivateOrganizationMembership: jest.fn(),
      patch: jest.fn(),
      findById: jest.fn(),
      listByOrganization: jest.fn(),
      listOrganizationMemberships: jest.fn(),
      addOrganizationMembership: jest.fn(),
      validateCredentials: jest.fn(),
      updateName: jest.fn(),
      changePassword: jest.fn(),
      findFoundingAdminUserId: jest.fn(),
      listPlatformDirectory: jest.fn(),
      getPlatformDashboardStats: jest.fn(),
      countUsersByOrganizationIds: jest.fn(),
    };

    mockSessionsService = {
      createSession: jest.fn(),
      validateSession: jest.fn(),
      revokeSession: jest.fn(),
      revokeOtherSessions: jest.fn(),
      listSessions: jest.fn(),
      getLatestLastSeenByUserIds: jest.fn(),
      listUserIdsActiveSince: jest.fn(),
      listAllDistinctUserIdsActiveSince: jest.fn(),
    };

    mockPreferencesService = {
      getPreferences: jest.fn(),
      updatePreferences: jest.fn(),
    };

    mockProspectOutreachService = {
      createProspectOutreach: jest.fn(),
      upsertProspectComment: jest.fn(),
      listProspectOutreachesBySirens: jest.fn(),
      listProspectOutreaches: jest.fn(),
    };

    mockImpersonationAuditService = {
      createImpersonationAudit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: AbstractUsersService, useValue: mockUsersService },
        { provide: AbstractUserSessionsService, useValue: mockSessionsService },
        { provide: AbstractUserPreferencesService, useValue: mockPreferencesService },
        { provide: AbstractProspectOutreachService, useValue: mockProspectOutreachService },
        { provide: AbstractImpersonationAuditService, useValue: mockImpersonationAuditService },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("createAccount", () => {
    it("should delegate to usersService.createAccount", async () => {
      const body = { email: "solo@example.com", password: "secret123", name: "Solo" };
      const expected = {
        user: {
          id: "user-1",
          email: "solo@example.com",
          name: "Solo",
          status: "active" as const,
          emailVerified: false,
        },
        emailVerificationCode: "123456",
      };
      mockUsersService.createAccount.mockResolvedValue(expected);

      const result = await controller.createAccount(body);

      expect(mockUsersService.createAccount).toHaveBeenCalledWith(body);
      expect(result).toEqual(expected);
    });
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
      const body = {
        password: "newpassword",
        name: "Activated User",
        organizationId: "org-1",
      };
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

      expect(mockUsersService.findById).toHaveBeenCalledWith("user-123", undefined);
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
    it("should call preferencesService.getPreferences and return the result", async () => {
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
      mockPreferencesService.getPreferences.mockResolvedValue(expected);

      const result = await controller.getPreferences("user-123", "org-1");

      expect(mockPreferencesService.getPreferences).toHaveBeenCalledWith("user-123", "org-1");
      expect(result).toEqual(expected);
    });
  });

  describe("updatePreferences", () => {
    it("should call preferencesService.updatePreferences and return the result", async () => {
      const body = { theme: "dark" as const };
      const expected: UserPreferencesResponse = {
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
      };
      mockPreferencesService.updatePreferences.mockResolvedValue(expected);

      const result = await controller.updatePreferences("user-123", body);

      expect(mockPreferencesService.updatePreferences).toHaveBeenCalledWith("user-123", body);
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
        emailVerified: true,
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
