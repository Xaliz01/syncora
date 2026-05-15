"use client";

import { useCallback } from "react";
import type { PermissionCode } from "@syncora/shared";
import { useAuth } from "@/components/auth/AuthContext";
import { hasPermission, hasAnyPermission } from "@/lib/auth-permissions";

/**
 * Exposes permission checks bound to the current user session.
 *
 * Mirrors the gateway's RequirePermissionGuard logic:
 * org admins always pass, members need the explicit code(s).
 */
export function usePermissions() {
  const { user } = useAuth();

  const can = useCallback((code: PermissionCode) => hasPermission(user, code), [user]);

  const canAny = useCallback((codes: PermissionCode[]) => hasAnyPermission(user, codes), [user]);

  const canAll = useCallback(
    (codes: PermissionCode[]) => {
      if (!user) return false;
      if (user.role === "admin") return true;
      const set = new Set(user.permissions ?? []);
      return codes.every((c) => set.has(c));
    },
    [user],
  );

  return { can, canAny, canAll, user } as const;
}
