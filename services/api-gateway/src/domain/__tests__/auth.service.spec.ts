import { Test, TestingModule } from "@nestjs/testing";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { ForbiddenException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { AuthService } from "../auth.service";
import { AbstractAuthService } from "../ports/auth.service.port";
import { AbstractSubscriptionsGatewayService } from "../ports/subscriptions.service.port";
import { AbstractUsersService } from "../users/ports/users.service.port";
import { AbstractUserSessionsService } from "../users/ports/user-sessions.service.port";
import { AbstractOrganizationsService } from "../organizations/ports/organizations.service.port";
import { AbstractPermissionsService } from "../permissions/ports/permissions.service.port";
import { AbstractTechniciansService } from "../technicians/ports/technicians.service.port";
import { AbstractEmailService } from "../notifications/ports/email.service.port";
import { ACCOUNT_REGISTERED_EVENT } from "../../infrastructure/account-registered.event";
import { ORGANIZATION_CREATED_EVENT } from "../../infrastructure/organization-created.event";

describe("AuthService", () => {
  let service: AuthService;
  let jwtService: JwtService;
  let jwtSignSpy: jest.SpyInstance;
  let eventEmitter: { emit: jest.Mock };
  let users: {
    create: jest.Mock;
    createAccount: jest.Mock;
    verifyEmail: jest.Mock;
    validateCredentials: jest.Mock;
    requestPasswordReset: jest.Mock;
    confirmPasswordReset: jest.Mock;
    findById: jest.Mock;
    listOrganizationMemberships: jest.Mock;
    findFoundingAdminUserId: jest.Mock;
  };
  let sessions: { createSession: jest.Mock };
  let organizations: { create: jest.Mock };
  let permissions: { resolveEffectivePermissions: jest.Mock };
  let technicians: { findByUserId: jest.Mock };
  let email: { sendTransactionalEmail: jest.Mock };

  const mockOrgResponse = {
    id: "org-123",
    name: "Test Org",
    createdAt: "2025-01-01T00:00:00.000Z",
  };

  const mockUserResponse = {
    id: "user-123",
    organizationId: "org-123",
    email: "admin@example.com",
    name: "Admin User",
    role: "admin" as const,
    status: "active" as const,
  };

  const mockValidateCredentialsResponse = {
    id: "user-123",
    organizationId: "org-123",
    email: "admin@example.com",
    name: "Admin User",
    role: "admin" as const,
    status: "active" as const,
    emailVerified: true,
  };

  const mockPermissionsResponse = {
    permissions: ["cases:read", "cases:write"],
  };

  const mockSubscriptionsGateway = {
    getCurrentSubscription: jest.fn().mockResolvedValue({
      organizationId: "org-123",
      status: "none",
      hasAccess: false,
      trialEndsAt: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      planName: "Essentiel",
      planLabel: "9,99 € / mois",
      activeAddons: [],
      addonQuantities: { extra_users: 0, extra_storage: 0 },
      includedUsers: 2,
      maxUsers: 2,
      storageQuotaBytes: 10 * 1024 ** 3,
      storageUsedBytes: 0,
      storageWarning: false,
      includedStorageBytes: 10 * 1024 ** 3,
      monthlyTotalCents: null,
      monthlyTotalCurrency: null,
    }),
    createCheckoutSession: jest.fn(),
    createAddonCheckoutSession: jest.fn(),
    createBillingPortalSession: jest.fn(),
    updateSubscriptionAddons: jest.fn(),
  };

  beforeEach(async () => {
    eventEmitter = { emit: jest.fn() };
    users = {
      create: jest.fn().mockResolvedValue(mockUserResponse),
      createAccount: jest.fn(),
      verifyEmail: jest.fn(),
      validateCredentials: jest.fn(),
      requestPasswordReset: jest.fn(),
      confirmPasswordReset: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(mockUserResponse),
      listOrganizationMemberships: jest
        .fn()
        .mockResolvedValue([
          { organizationId: "org-123", role: "admin", membershipStatus: "active" },
        ]),
      findFoundingAdminUserId: jest.fn().mockResolvedValue(null),
    };
    sessions = {
      createSession: jest.fn().mockResolvedValue({ sessionId: "session-abc" }),
    };
    organizations = { create: jest.fn().mockResolvedValue(mockOrgResponse) };
    permissions = {
      resolveEffectivePermissions: jest.fn().mockResolvedValue(mockPermissionsResponse),
    };
    technicians = { findByUserId: jest.fn().mockResolvedValue(null) };
    email = {
      sendTransactionalEmail: jest.fn().mockResolvedValue({ sent: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: "test-secret",
          signOptions: { expiresIn: "7d" },
        }),
      ],
      providers: [
        { provide: AbstractAuthService, useClass: AuthService },
        { provide: AbstractSubscriptionsGatewayService, useValue: mockSubscriptionsGateway },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: AbstractUsersService, useValue: users },
        { provide: AbstractUserSessionsService, useValue: sessions },
        { provide: AbstractOrganizationsService, useValue: organizations },
        { provide: AbstractPermissionsService, useValue: permissions },
        { provide: AbstractTechniciansService, useValue: technicians },
        { provide: AbstractEmailService, useValue: email },
      ],
    }).compile();

    service = module.get<AbstractAuthService>(AbstractAuthService) as AuthService;
    jwtService = module.get<JwtService>(JwtService);
    jwtSignSpy = jest.spyOn(jwtService, "sign").mockReturnValue("mock-jwt-token");
  });

  afterEach(() => {
    jwtSignSpy?.mockRestore();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("register", () => {
    it("should successfully register and return auth response with JWT", async () => {
      const body = {
        organizationName: "Test Org",
        organizationSiret: "12345678901234",
        adminEmail: "admin@example.com",
        adminPassword: "secret123",
        adminName: "Admin User",
      };

      const result = await service.register(body);

      expect(result.accessToken).toBe("mock-jwt-token");
      expect(result.user.id).toBe("user-123");
      expect(result.user.email).toBe("admin@example.com");
      expect(result.user.organizationId).toBe("org-123");
      expect(organizations.create).toHaveBeenCalled();
      expect(users.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-123",
          email: "admin@example.com",
          role: "admin",
        }),
      );
      expect(sessions.createSession).toHaveBeenCalledWith("user-123", { userAgent: undefined });
      expect(jwtSignSpy).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        ORGANIZATION_CREATED_EVENT,
        expect.objectContaining({
          organizationId: "org-123",
          name: "Test Org",
          createdByUserId: "user-123",
          createdByEmail: "admin@example.com",
        }),
      );
    });
  });

  describe("registerAccount", () => {
    it("should create account and require email verification (no JWT yet)", async () => {
      users.createAccount.mockResolvedValue({
        user: {
          id: "user-new",
          email: "new@example.com",
          name: "New Admin",
          status: "active",
          emailVerified: false,
        },
        emailVerificationCode: "123456",
      });

      const result = await service.registerAccount({
        email: "new@example.com",
        password: "secret123",
        name: "New Admin",
      });

      expect(result).toMatchObject({
        status: "email_verification_required",
        email: "new@example.com",
      });
      expect(jwtSignSpy).not.toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(ACCOUNT_REGISTERED_EVENT, {
        userId: "user-new",
        email: "new@example.com",
        name: "New Admin",
      });
      expect(email.sendTransactionalEmail).toHaveBeenCalledWith(
        "new@example.com",
        "Vérifiez votre adresse e-mail",
        expect.stringContaining("seul le dernier code est valable"),
      );
    });

    it("should not send another OTP email when the account already has a valid code", async () => {
      users.createAccount.mockResolvedValue({
        user: {
          id: "user-new",
          email: "new@example.com",
          name: "New Admin",
          status: "active",
          emailVerified: false,
        },
      });

      const result = await service.registerAccount({
        email: "new@example.com",
        password: "secret123",
        name: "New Admin",
      });

      expect(result).toMatchObject({
        status: "email_verification_required",
        email: "new@example.com",
      });
      expect(email.sendTransactionalEmail).not.toHaveBeenCalled();
    });

    it("should verify email and return onboarding JWT", async () => {
      users.verifyEmail.mockResolvedValue({
        id: "user-new",
        email: "new@example.com",
        name: "New Admin",
        status: "active",
        emailVerified: true,
      });

      const result = await service.verifyEmail({
        email: "new@example.com",
        code: "123456",
      });

      expect(result.accessToken).toBe("mock-jwt-token");
      expect(result.user.email).toBe("new@example.com");
      expect(jwtSignSpy).toHaveBeenCalledWith(
        expect.objectContaining({ kind: "onboarding", sub: "user-new" }),
        expect.objectContaining({ expiresIn: "1d" }),
      );
    });
  });

  describe("login", () => {
    it("should successfully login and return auth response with JWT", async () => {
      users.validateCredentials.mockResolvedValue(mockValidateCredentialsResponse);

      const result = await service.login({
        email: "admin@example.com",
        password: "secret123",
      });

      expect(result.accessToken).toBe("mock-jwt-token");
      expect(jwtSignSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: "user-123",
          sid: "session-abc",
        }),
      );
      expect(result.user.id).toBe("user-123");
      expect(result.user.email).toBe("admin@example.com");
      expect(jwtSignSpy).toHaveBeenCalled();
    });

    it("should return onboarding JWT when user has no organization yet", async () => {
      users.validateCredentials.mockResolvedValue({
        id: "user-pending",
        email: "pending@example.com",
        status: "active",
        emailVerified: true,
      });

      const result = await service.login({
        email: "pending@example.com",
        password: "secret123",
      });

      expect(result.accessToken).toBe("mock-jwt-token");
      expect(result.user.email).toBe("pending@example.com");
      expect("organizationId" in result.user).toBe(false);
      expect(jwtSignSpy).toHaveBeenCalledWith(
        expect.objectContaining({ kind: "onboarding", sub: "user-pending" }),
        expect.objectContaining({ expiresIn: "1d" }),
      );
    });

    it("should throw UnauthorizedException on failed login (401)", async () => {
      users.validateCredentials.mockResolvedValue(null);

      await expect(
        service.login({
          email: "wrong@example.com",
          password: "wrongpassword",
        }),
      ).rejects.toThrow(UnauthorizedException);
      expect(jwtSignSpy).not.toHaveBeenCalled();
    });

    it("should throw ForbiddenException when organization access is disabled", async () => {
      users.validateCredentials.mockRejectedValue(
        new ForbiddenException(
          "Votre accès à l'organisation a été désactivé. Contactez un administrateur pour être réactivé.",
        ),
      );

      await expect(
        service.login({ email: "disabled@example.com", password: "secret123" }),
      ).rejects.toThrow(ForbiddenException);
      expect(jwtSignSpy).not.toHaveBeenCalled();
    });
  });

  describe("getSessionUser", () => {
    const jwtPayload = {
      sub: "user-123",
      organizationId: "org-123",
      role: "admin" as const,
      status: "active" as const,
      permissions: ["cases.read" as const],
      email: "admin@example.com",
      name: "Stale JWT Name",
    };

    it("should return the name from users-service, not the JWT", async () => {
      users.findById.mockResolvedValue({ ...mockUserResponse, name: "Fresh DB Name" });

      const user = await service.getSessionUser(jwtPayload);

      expect(user.name).toBe("Fresh DB Name");
      expect(user.email).toBe("admin@example.com");
    });

    it("should fall back to JWT name when users-service is unavailable", async () => {
      users.findById.mockRejectedValue(new NotFoundException());

      const user = await service.getSessionUser(jwtPayload);

      expect(user.name).toBe("Stale JWT Name");
    });
  });

  describe("forgotPassword", () => {
    it("returns ok without revealing missing email", async () => {
      users.requestPasswordReset.mockRejectedValue(new NotFoundException());

      await expect(service.forgotPassword({ email: "unknown@example.com" })).resolves.toEqual({
        ok: true,
      });
    });

    it("sends reset email when user exists", async () => {
      users.requestPasswordReset.mockResolvedValue({
        email: "user@example.com",
        resetToken: "tok-abc",
      });

      const result = await service.forgotPassword({ email: "user@example.com" });
      expect(result.ok).toBe(true);
      expect(email.sendTransactionalEmail).toHaveBeenCalledWith(
        "user@example.com",
        expect.any(String),
        expect.any(String),
        expect.stringContaining("/reset-password?token="),
        expect.any(String),
      );
    });
  });

  describe("resetPassword", () => {
    it("confirms reset via users-service", async () => {
      await expect(
        service.resetPassword({ token: "tok", newPassword: "Newpass1" }),
      ).resolves.toEqual({ ok: true });
      expect(users.confirmPasswordReset).toHaveBeenCalledWith({
        token: "tok",
        newPassword: "Newpass1",
      });
    });
  });
});
