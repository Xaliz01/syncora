import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RequirePermissionGuard } from "../require-permission.guard";
import type { JwtPayload } from "@syncora/shared";

describe("RequirePermissionGuard", () => {
  const reflector = new Reflector();
  const guard = new RequirePermissionGuard(reflector);

  const memberJwt: JwtPayload = {
    sub: "user-1",
    organizationId: "org-1",
    role: "member",
    status: "active",
    permissions: ["organizations.create"],
    email: "member@example.com",
  };

  function contextWithUser(user: JwtPayload | undefined) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as never;
  }

  beforeEach(() => {
    jest.spyOn(reflector, "getAllAndOverride").mockImplementation((key) => {
      if (key === "requiredAnyPermissions") return undefined;
      if (key === "requiredPermissions") return ["organizations.create"];
      return undefined;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("allows org admins without explicit permission codes", () => {
    const adminJwt: JwtPayload = { ...memberJwt, role: "admin", permissions: [] };
    expect(guard.canActivate(contextWithUser(adminJwt))).toBe(true);
  });

  it("allows members with the required permission", () => {
    expect(guard.canActivate(contextWithUser(memberJwt))).toBe(true);
  });

  it("denies members without the required permission", () => {
    const jwt: JwtPayload = { ...memberJwt, permissions: [] };
    expect(() => guard.canActivate(contextWithUser(jwt))).toThrow(ForbiddenException);
  });

  it("denies members without organizations.create on that route", () => {
    const jwt: JwtPayload = { ...memberJwt, permissions: ["cases.read"] };
    expect(() => guard.canActivate(contextWithUser(jwt))).toThrow(ForbiddenException);
  });
});
