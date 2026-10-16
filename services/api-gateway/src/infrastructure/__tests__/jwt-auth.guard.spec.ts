import { UnauthorizedException } from "@nestjs/common";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { Test } from "@nestjs/testing";
import type { ExecutionContext } from "@nestjs/common";
import { SESSION_REPLACED_MESSAGE } from "@planwise/shared";
import { JwtAuthGuard } from "../jwt-auth.guard";
import { AbstractUserSessionsService } from "../../domain/users/ports/user-sessions.service.port";

describe("JwtAuthGuard", () => {
  let guard: JwtAuthGuard;
  let jwtService: JwtService;
  let sessions: { validateSession: jest.Mock };

  const mockContext = (authHeader?: string): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: authHeader },
        }),
      }),
    }) as ExecutionContext;

  beforeEach(async () => {
    sessions = { validateSession: jest.fn() };
    const module = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: "test-secret",
          signOptions: { expiresIn: "7d" },
        }),
      ],
      providers: [JwtAuthGuard, { provide: AbstractUserSessionsService, useValue: sessions }],
    }).compile();
    guard = module.get(JwtAuthGuard);
    jwtService = module.get(JwtService);
  });

  it("accepts a normal session JWT with valid sid", async () => {
    sessions.validateSession.mockResolvedValue({ valid: true });
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
    expect(sessions.validateSession).toHaveBeenCalledWith("user-1", "session-1");
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
    expect(sessions.validateSession).not.toHaveBeenCalled();
  });

  it("rejects when session is no longer valid", async () => {
    sessions.validateSession.mockResolvedValue({ valid: false });
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
    sessions.validateSession.mockRejectedValue(new Error("network"));
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
    expect(sessions.validateSession).not.toHaveBeenCalled();
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
