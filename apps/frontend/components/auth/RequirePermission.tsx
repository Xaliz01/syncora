"use client";

import React from "react";
import { useRouter } from "next/navigation";
import type { PermissionCode } from "@syncora/shared";
import { useAuth } from "./AuthContext";
import { hasPermission, hasAnyPermission } from "@/lib/auth-permissions";

interface RequirePermissionProps {
  /** Single permission code required. */
  permission?: PermissionCode;
  /** Multiple codes — user needs at least one (OR). */
  anyOf?: PermissionCode[];
  children: React.ReactNode;
  /** Where to redirect when the permission check fails. Defaults to `/`. */
  redirectTo?: string;
}

/**
 * Page-level permission guard (replaces RequireAdmin for permission-based access).
 *
 * Wraps content that should only be accessible to users with a given
 * permission. Redirects to `redirectTo` (default `/`) when the check fails.
 *
 * Must be nested inside `<RequireAuth>` so `isAuthenticated` and `user` are
 * guaranteed available.
 */
export function RequirePermission({
  permission,
  anyOf,
  children,
  redirectTo = "/",
}: RequirePermissionProps) {
  const { isAuthenticated, isReady, user } = useAuth();
  const router = useRouter();

  const allowed = React.useMemo(() => {
    if (!user) return false;
    if (permission) return hasPermission(user, permission);
    if (anyOf && anyOf.length > 0) return hasAnyPermission(user, anyOf);
    return false;
  }, [user, permission, anyOf]);

  React.useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!allowed) {
      router.replace(redirectTo);
    }
  }, [isReady, isAuthenticated, allowed, router, redirectTo]);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-slate-500 dark:text-slate-400">Chargement…</div>
      </div>
    );
  }

  if (!isAuthenticated || !allowed) return null;
  return <>{children}</>;
}
