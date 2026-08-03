import { Test, TestingModule } from "@nestjs/testing";
import { JwtModule } from "@nestjs/jwt";
import type { AuthResponse, JwtPayload } from "@planwise/shared";
import { AuthController } from "../auth.controller";
import { AbstractAuthService } from "../../../domain/ports/auth.service.port";
import { JwtAuthGuard } from "../../../infrastructure/jwt-auth.guard";
import { CreateOrganizationGuard } from "../../../infrastructure/create-organization.guard";
import { OnboardingAuthGuard } from "../../../infrastructure/onboarding-auth.guard";

describe("AuthController", () => {
  let controller: AuthController;
  let mockAuthService: jest.Mocked<AbstractAuthService>;

  const mockAuthResponse: AuthResponse = {
    accessToken: "mock-jwt-token",
    user: {
      id: "user-123",
      email: "admin@example.com",
      organizationId: "org-123",
      role: "admin",
      status: "active",
      permissions: [],
      name: "Admin User",
    },
  };

  beforeEach(async () => {
    mockAuthService = {
      register: jest.fn(),
      registerAccount: jest.fn(),
      verifyEmail: jest.fn(),
      resendEmailVerification: jest.fn(),
      getOnboardingUser: jest.fn(),
      login: jest.fn(),
      acceptInvitation: jest.fn(),
      resolveInvitation: jest.fn(),
      createOrganization: jest.fn(),
      switchOrganization: jest.fn(),
      getSessionUser: jest.fn(),
      logout: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: "test-secret",
          signOptions: { expiresIn: "7d" },
        }),
      ],
      controllers: [AuthController],
      providers: [
        {
          provide: AbstractAuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(CreateOrganizationGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(OnboardingAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("registerAccount", () => {
    it("should call authService.registerAccount and return email verification required", async () => {
      const body = {
        email: "admin@example.com",
        password: "secret123",
        name: "Admin User",
      };
      const verificationResponse = {
        status: "email_verification_required" as const,
        email: "admin@example.com",
      };
      mockAuthService.registerAccount.mockResolvedValue(verificationResponse);

      const result = await controller.registerAccount(body);

      expect(mockAuthService.registerAccount).toHaveBeenCalledWith(body);
      expect(result).toEqual(verificationResponse);
    });
  });

  describe("verifyEmail", () => {
    it("should call authService.verifyEmail and return onboarding response", async () => {
      const body = { email: "admin@example.com", code: "123456" };
      const onboardingResponse = {
        accessToken: "onboarding-token",
        user: {
          id: "user-123",
          email: "admin@example.com",
          name: "Admin User",
          status: "active" as const,
        },
      };
      mockAuthService.verifyEmail.mockResolvedValue(onboardingResponse);

      const result = await controller.verifyEmail(body);

      expect(mockAuthService.verifyEmail).toHaveBeenCalledWith(body);
      expect(result).toEqual(onboardingResponse);
    });
  });

  describe("register", () => {
    it("should call authService.register and return auth response", async () => {
      const body = {
        organizationName: "Test Org",
        organizationSiret: "12345678901234",
        adminEmail: "admin@example.com",
        adminPassword: "secret123",
        adminName: "Admin User",
      };
      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      const result = await controller.register(body, {
        headers: { "user-agent": "JestAgent/1.0" },
      } as never);

      expect(mockAuthService.register).toHaveBeenCalledWith(body, {
        userAgent: "JestAgent/1.0",
      });
      expect(result).toEqual(mockAuthResponse);
      expect(result.accessToken).toBe("mock-jwt-token");
    });
  });

  describe("login", () => {
    it("should call authService.login and return auth response", async () => {
      const body = {
        email: "admin@example.com",
        password: "secret123",
      };
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(body, {
        headers: { "user-agent": "JestAgent/1.0" },
      } as never);

      expect(mockAuthService.login).toHaveBeenCalledWith(body, {
        userAgent: "JestAgent/1.0",
      });
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe("me", () => {
    it("should call authService.getSessionUser with JWT payload", async () => {
      const jwtPayload: JwtPayload = {
        sub: "user-123",
        organizationId: "org-123",
        role: "admin",
        status: "active",
        permissions: [],
        email: "admin@example.com",
        name: "Admin User",
      };
      mockAuthService.getSessionUser.mockResolvedValue(mockAuthResponse.user);

      const result = await controller.me({ user: jwtPayload } as never);

      expect(mockAuthService.getSessionUser).toHaveBeenCalledWith(jwtPayload);
      expect(result).toEqual(mockAuthResponse.user);
    });
  });

  describe("createOrganization", () => {
    it("should call authService.createOrganization when the member has organizations.create", async () => {
      const body = { name: "New Org", siret: "98765432109876" };
      const jwtPayload: JwtPayload = {
        sub: "user-123",
        organizationId: "org-123",
        role: "member",
        status: "active",
        permissions: ["organizations.create"],
        email: "member@example.com",
      };
      mockAuthService.createOrganization.mockResolvedValue(mockAuthResponse);

      const result = await controller.createOrganization(body, {
        user: jwtPayload,
        headers: { "user-agent": "JestAgent/1.0" },
      } as never);

      expect(mockAuthService.createOrganization).toHaveBeenCalledWith(body, jwtPayload, {
        userAgent: "JestAgent/1.0",
      });
      expect(result).toEqual(mockAuthResponse);
    });
  });

  describe("acceptInvitation", () => {
    it("should call authService.acceptInvitation and return auth response", async () => {
      const body = {
        invitationToken: "inv-token-123",
        password: "newpassword",
        name: "New User",
      };
      mockAuthService.acceptInvitation.mockResolvedValue(mockAuthResponse);

      const result = await controller.acceptInvitation(body, {
        headers: { "user-agent": "JestAgent/1.0" },
      } as never);

      expect(mockAuthService.acceptInvitation).toHaveBeenCalledWith(body, {
        userAgent: "JestAgent/1.0",
        authenticatedUserId: undefined,
      });
      expect(result).toEqual(mockAuthResponse);
    });
  });
});
