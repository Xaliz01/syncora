import { UnauthorizedException } from "@nestjs/common";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import type { ExecutionContext } from "@nestjs/common";
import { JwtAuthGuard } from "../jwt-auth.guard";

describe("JwtAuthGuard", () => {
  let guard: JwtAuthGuard;
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
          signOptions: { expiresIn: "7d" },
        }),
      ],
      providers: [JwtAuthGuard],
    }).compile();
    guard = module.get(JwtAuthGuard);
    jwtService = module.get(JwtService);
  });

  it("accepts a normal session JWT", () => {
    const token = jwtService.sign({
      sub: "user-1",
      organizationId: "org-1",
      role: "admin",
      status: "active",
      permissions: [],
      email: "a@b.fr",
    });
    expect(guard.canActivate(mockContext(`Bearer ${token}`))).toBe(true);
  });

  it("rejects onboarding JWT", () => {
    const token = jwtService.sign({
      kind: "onboarding",
      sub: "user-1",
      email: "a@b.fr",
      status: "active",
    });
    expect(() => guard.canActivate(mockContext(`Bearer ${token}`))).toThrow(UnauthorizedException);
  });
});
