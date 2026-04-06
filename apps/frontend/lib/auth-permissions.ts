import type { AuthUser, PermissionCode } from "@syncora/shared";

/** Aligné sur RequirePermissionGuard côté gateway (admin org = tous les droits). */
export function hasPermission(user: AuthUser | null | undefined, code: PermissionCode): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  return !!user.permissions?.includes(code);
}

export function hasAnyPermission(
  user: AuthUser | null | undefined,
  codes: PermissionCode[]
): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  const set = new Set(user.permissions ?? []);
  return codes.some((c) => set.has(c));
}
