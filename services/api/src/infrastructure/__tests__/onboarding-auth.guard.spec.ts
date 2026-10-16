import { UnauthorizedException } from "@nestjs/common";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import type { ExecutionContext } from "@nestjs/common";
import { OnboardingAuthGuard } from "../onboarding-auth.guard";

describe("OnboardingAuthGuard", () => {
  let guard: OnboardingAuthGuard;
  let jwtService: JwtService;

  const mockContext = (authHeader?: string): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: authHeader },
        }),
      }),
    }) as ExecutionContext;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: "test-secret",
          signOptions: { expiresIn: "1d" },
        }),
      ],
      providers: [OnboardingAuthGuard],
    }).compile();
    guard = module.get(OnboardingAuthGuard);
    jwtService = module.get(JwtService);
  });

  it("accepts onboarding JWT", () => {
    const token = jwtService.sign({
      kind: "onboarding",
      sub: "user-1",
      email: "a@b.fr",
      status: "active",
    });
    expect(guard.canActivate(mockContext(`Bearer ${token}`))).toBe(true);
  });

  it("rejects normal session JWT", () => {
    const token = jwtService.sign({
      sub: "user-1",
      organizationId: "org-1",
      role: "admin",
      status: "active",
      permissions: [],
      email: "a@b.fr",
    });
    expect(() => guard.canActivate(mockContext(`Bearer ${token}`))).toThrow(UnauthorizedException);
  });
});
