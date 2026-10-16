import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { AdminRoleGuard } from "../admin-role.guard";
import type { JwtPayload } from "@planwise/shared";

describe("AdminRoleGuard", () => {
  const guard = new AdminRoleGuard();

  function contextFor(user: JwtPayload | undefined): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as ExecutionContext;
  }

  const admin: JwtPayload = {
    sub: "user-1",
    email: "admin@test.fr",
    organizationId: "org-1",
    role: "admin",
    status: "active",
    permissions: [],
  };

  const member: JwtPayload = {
    sub: "user-2",
    email: "member@test.fr",
    organizationId: "org-1",
    role: "member",
    status: "active",
    permissions: ["cases.read"],
  };

  it("allows organization admins", () => {
    expect(guard.canActivate(contextFor(admin))).toBe(true);
  });

  it("denies members", () => {
    expect(() => guard.canActivate(contextFor(member))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(contextFor(member))).toThrow("Rôle administrateur requis");
  });

  it("denies when user context is missing", () => {
    expect(() => guard.canActivate(contextFor(undefined))).toThrow(ForbiddenException);
  });
});
