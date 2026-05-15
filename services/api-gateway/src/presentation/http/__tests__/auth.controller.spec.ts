import { Test, TestingModule } from "@nestjs/testing";
import { JwtModule } from "@nestjs/jwt";
import type { AuthResponse, JwtPayload } from "@syncora/shared";
import { AuthController } from "../auth.controller";
import { AbstractAuthService } from "../../../domain/ports/auth.service.port";
import { JwtAuthGuard } from "../../../infrastructure/jwt-auth.guard";

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
      login: jest.fn(),
      acceptInvitation: jest.fn(),
      createOrganization: jest.fn(),
      switchOrganization: jest.fn(),
      getSessionUser: jest.fn(),
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
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("register", () => {
    it("should call authService.register and return auth response", async () => {
      const body = {
        organizationName: "Test Org",
        adminEmail: "admin@example.com",
        adminPassword: "secret123",
        adminName: "Admin User",
      };
      mockAuthService.register.mockResolvedValue(mockAuthResponse);

      const result = await controller.register(body);

      expect(mockAuthService.register).toHaveBeenCalledWith(body);
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

      const result = await controller.login(body);

      expect(mockAuthService.login).toHaveBeenCalledWith(body);
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

  describe("acceptInvitation", () => {
    it("should call authService.acceptInvitation and return auth response", async () => {
      const body = {
        invitationToken: "inv-token-123",
        password: "newpassword",
        name: "New User",
      };
      mockAuthService.acceptInvitation.mockResolvedValue(mockAuthResponse);

      const result = await controller.acceptInvitation(body);

      expect(mockAuthService.acceptInvitation).toHaveBeenCalledWith(body);
      expect(result).toEqual(mockAuthResponse);
    });
  });
});
