import { ForbiddenException } from "@nestjs/common";
import {
  assertAnyAssignablePermission,
  assertAssignablePermission,
  hasAnyAssignablePermission,
  hasAssignablePermission,
} from "../permission-checks";
import type { AuthUser } from "@syncora/shared";

const member: AuthUser = {
  id: "user-1",
  email: "member@example.com",
  organizationId: "org-1",
  role: "member",
  status: "active",
  permissions: ["organizations.create"],
};

describe("permission-checks", () => {
  it("grants all assignable permissions to org admins", () => {
    const admin: AuthUser = { ...member, role: "admin", permissions: [] };
    expect(hasAssignablePermission(admin, "organizations.update")).toBe(true);
    expect(() => assertAssignablePermission(admin, "organizations.update")).not.toThrow();
  });

  it("checks explicit member permissions", () => {
    expect(hasAssignablePermission(member, "organizations.create")).toBe(true);
    expect(hasAssignablePermission(member, "organizations.update")).toBe(false);
    expect(hasAnyAssignablePermission(member, ["cases.assign", "cases.update"])).toBe(false);
  });

  it("throws when a required permission is missing", () => {
    expect(() => assertAssignablePermission(member, "organizations.update")).toThrow(
      ForbiddenException,
    );
    expect(() => assertAnyAssignablePermission(member, ["cases.assign", "cases.update"])).toThrow(
      ForbiddenException,
    );
  });
});
