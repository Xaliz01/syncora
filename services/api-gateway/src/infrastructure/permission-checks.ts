import { ForbiddenException } from "@nestjs/common";
import type { AuthUser, JwtPayload, PermissionCode } from "@syncora/shared";

type PermissionSubject =
  | Pick<AuthUser, "role" | "permissions">
  | Pick<JwtPayload, "role" | "permissions">;

function permissionSet(subject: PermissionSubject): Set<PermissionCode> {
  return new Set((subject.permissions ?? []) as PermissionCode[]);
}

export function hasAssignablePermission(subject: PermissionSubject, code: PermissionCode): boolean {
  if (subject.role === "admin") return true;
  return permissionSet(subject).has(code);
}

export function hasAnyAssignablePermission(
  subject: PermissionSubject,
  codes: PermissionCode[],
): boolean {
  if (subject.role === "admin") return true;
  const set = permissionSet(subject);
  return codes.some((code) => set.has(code));
}

export function assertAssignablePermission(subject: PermissionSubject, code: PermissionCode): void {
  if (!hasAssignablePermission(subject, code)) {
    throw new ForbiddenException("Permissions insuffisantes");
  }
}

export function assertAnyAssignablePermission(
  subject: PermissionSubject,
  codes: PermissionCode[],
): void {
  if (!hasAnyAssignablePermission(subject, codes)) {
    throw new ForbiddenException("Permissions insuffisantes");
  }
}
