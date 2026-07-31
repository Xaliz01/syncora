import { UnauthorizedException } from "@nestjs/common";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { HttpService } from "@nestjs/axios";
import { Test } from "@nestjs/testing";
import type { ExecutionContext } from "@nestjs/common";
import { of, throwError } from "rxjs";
import { SESSION_REPLACED_MESSAGE } from "@planwise/shared";
import { JwtAuthGuard } from "../jwt-auth.guard";

describe("JwtAuthGuard", () => {
  let guard: JwtAuthGuard;
  let jwtService: JwtService;
  let httpService: { post: jest.Mock };

  const mockContext = (authHeader?: string): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: authHeader },
        }),
      }),
    }) as ExecutionContext;

  beforeEach(async () => {
    httpService = { post: jest.fn() };
    const module = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: "test-secret",
          signOptions: { expiresIn: "7d" },
        }),
      ],
      providers: [JwtAuthGuard, { provide: HttpService, useValue: httpService }],
    }).compile();
    guard = module.get(JwtAuthGuard);
    jwtService = module.get(JwtService);
  });

  it("accepts a normal session JWT with valid sid", async () => {
    httpService.post.mockReturnValue(of({ data: { valid: true } }));
    const token = jwtService.sign({
      sub: "user-1",
      organizationId: "org-1",
      role: "admin",
      status: "active",
      permissions: [],
      email: "a@b.fr",
      sid: "session-1",
    });
    await expect(guard.canActivate(mockContext(`Bearer ${token}`))).resolves.toBe(true);
    expect(httpService.post).toHaveBeenCalledWith(
      expect.stringContaining("/users/validate-session"),
      { userId: "user-1", sessionId: "session-1" },
    );
  });

  it("rejects JWT without sid", async () => {
    const token = jwtService.sign({
      sub: "user-1",
      organizationId: "org-1",
      role: "admin",
      status: "active",
      permissions: [],
      email: "a@b.fr",
    });
    await expect(guard.canActivate(mockContext(`Bearer ${token}`))).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(guard.canActivate(mockContext(`Bearer ${token}`))).rejects.toThrow(
      SESSION_REPLACED_MESSAGE,
    );
    expect(httpService.post).not.toHaveBeenCalled();
  });

  it("rejects when session is no longer valid", async () => {
    httpService.post.mockReturnValue(of({ data: { valid: false } }));
    const token = jwtService.sign({
      sub: "user-1",
      organizationId: "org-1",
      role: "admin",
      status: "active",
      permissions: [],
      email: "a@b.fr",
      sid: "old-session",
    });
    await expect(guard.canActivate(mockContext(`Bearer ${token}`))).rejects.toThrow(
      SESSION_REPLACED_MESSAGE,
    );
  });

  it("rejects when session validation request fails", async () => {
    httpService.post.mockReturnValue(throwError(() => new Error("network")));
    const token = jwtService.sign({
      sub: "user-1",
      organizationId: "org-1",
      role: "admin",
      status: "active",
      permissions: [],
      email: "a@b.fr",
      sid: "session-1",
    });
    await expect(guard.canActivate(mockContext(`Bearer ${token}`))).rejects.toThrow(
      SESSION_REPLACED_MESSAGE,
    );
  });

  it("skips session check for impersonation JWT", async () => {
    const token = jwtService.sign({
      sub: "user-1",
      organizationId: "org-1",
      role: "admin",
      status: "active",
      permissions: [],
      email: "a@b.fr",
      impersonatorId: "staff-1",
      impersonatorEmail: "staff@planwise.fr",
    });
    await expect(guard.canActivate(mockContext(`Bearer ${token}`))).resolves.toBe(true);
    expect(httpService.post).not.toHaveBeenCalled();
  });

  it("rejects onboarding JWT", async () => {
    const token = jwtService.sign({
      kind: "onboarding",
      sub: "user-1",
      email: "a@b.fr",
      status: "active",
    });
    await expect(guard.canActivate(mockContext(`Bearer ${token}`))).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
