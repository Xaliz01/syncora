import { Test, TestingModule } from "@nestjs/testing";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { HttpModule, HttpService } from "@nestjs/axios";
import { UnauthorizedException } from "@nestjs/common";
import { of, throwError } from "rxjs";
import type { AxiosResponse } from "axios";
import { AuthService } from "../auth.service";
import { AbstractAuthService } from "../ports/auth.service.port";
import { AbstractSubscriptionsGatewayService } from "../ports/subscriptions.service.port";

describe("AuthService", () => {
  let service: AuthService;
  let httpService: HttpService;
  let jwtService: JwtService;
  let jwtSignSpy: jest.SpyInstance;

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
    role: "admin",
    status: "active",
  };

  const mockValidateCredentialsResponse = {
    id: "user-123",
    organizationId: "org-123",
    email: "admin@example.com",
    name: "Admin User",
    role: "admin",
    status: "active",
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
      planLabel: "9,99 € / mois",
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        HttpModule.register({ timeout: 5000 }),
        JwtModule.register({
          secret: "test-secret",
          signOptions: { expiresIn: "7d" },
        }),
      ],
      providers: [
        { provide: AbstractAuthService, useClass: AuthService },
        { provide: AbstractSubscriptionsGatewayService, useValue: mockSubscriptionsGateway },
      ],
    }).compile();

    service = module.get<AbstractAuthService>(AbstractAuthService) as AuthService;
    httpService = module.get<HttpService>(HttpService);
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
      jest.spyOn(httpService, "post").mockImplementation((url: string) => {
        let response: AxiosResponse;
        if (url.includes("/organizations")) {
          response = { data: mockOrgResponse, status: 201, statusText: "Created" } as AxiosResponse;
        } else if (url.includes("/users") && !url.includes("validate-credentials")) {
          response = {
            data: mockUserResponse,
            status: 201,
            statusText: "Created",
          } as AxiosResponse;
        } else if (url.includes("/permissions/effective")) {
          response = { data: mockPermissionsResponse, status: 200 } as AxiosResponse;
        } else {
          response = { data: {}, status: 200 } as AxiosResponse;
        }
        return of(response);
      });

      const body = {
        organizationName: "Test Org",
        adminEmail: "admin@example.com",
        adminPassword: "secret123",
        adminName: "Admin User",
      };

      const result = await service.register(body);

      expect(result.accessToken).toBe("mock-jwt-token");
      expect(result.user.id).toBe("user-123");
      expect(result.user.email).toBe("admin@example.com");
      expect(result.user.organizationId).toBe("org-123");
      expect(jwtSignSpy).toHaveBeenCalled();
    });
  });

  describe("login", () => {
    it("should successfully login and return auth response with JWT", async () => {
      jest.spyOn(httpService, "post").mockImplementation((url: string) => {
        let response: AxiosResponse;
        if (url.includes("validate-credentials")) {
          response = { data: mockValidateCredentialsResponse, status: 200 } as AxiosResponse;
        } else if (url.includes("/permissions/effective")) {
          response = { data: mockPermissionsResponse, status: 200 } as AxiosResponse;
        } else {
          response = { data: {}, status: 200 } as AxiosResponse;
        }
        return of(response);
      });

      const body = {
        email: "admin@example.com",
        password: "secret123",
      };

      const result = await service.login(body);

      expect(result.accessToken).toBe("mock-jwt-token");
      expect(result.user.id).toBe("user-123");
      expect(result.user.email).toBe("admin@example.com");
      expect(jwtSignSpy).toHaveBeenCalled();
    });

    it("should throw UnauthorizedException on failed login (401)", async () => {
      jest.spyOn(httpService, "post").mockImplementation((url: string) => {
        if (url.includes("validate-credentials")) {
          return throwError(() => ({
            response: { status: 401 },
          }));
        }
        return of({ data: {}, status: 200 } as AxiosResponse);
      });

      const body = {
        email: "wrong@example.com",
        password: "wrongpassword",
      };

      await expect(service.login(body)).rejects.toThrow(UnauthorizedException);
      expect(jwtSignSpy).not.toHaveBeenCalled();
    });
  });
});
